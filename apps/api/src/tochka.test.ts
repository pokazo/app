import { afterEach, describe, expect, it, vi } from "vitest";
import { generateKeyPair, SignJWT } from "jose";
import { config } from "./env.js";
import {
  HttpTochkaClient,
  StubTochkaClient,
  TochkaError,
  getTochkaClient,
  isTochkaPaidStatus,
  parseTochkaWebhook,
  verifyTochkaWebhookJwt,
} from "./tochka.js";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("getTochkaClient", () => {
  it("returns StubTochkaClient when access token is empty", () => {
    vi.spyOn(config, "tochkaAccessToken", "get").mockReturnValue("   ");
    expect(getTochkaClient()).toBeInstanceOf(StubTochkaClient);
  });

  it("returns HttpTochkaClient when access token is set", () => {
    vi.spyOn(config, "tochkaAccessToken", "get").mockReturnValue("live-token");
    expect(getTochkaClient()).toBeInstanceOf(HttpTochkaClient);
  });
});

describe("StubTochkaClient", () => {
  it("returns a fake payment url", async () => {
    const client = new StubTochkaClient();
    const payment = await client.createPaymentLink({
      amountKopecks: 19_900,
      purpose: "Показо: 1 презентация",
      paymentId: "pay1",
      failRedirectUrl: "http://localhost/app",
      successRedirectUrl: "http://localhost/app?paid=1",
    });

    expect(payment.operationId).toBeTruthy();
    expect(payment.paymentUrl).toContain("stub");
  });
});

describe("HttpTochkaClient", () => {
  it("creates a payment using the Tochka acquiring API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          Data: { operationId: "op-1", paymentLink: "https://pay.tochka.test/op-1" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const client = new HttpTochkaClient({
      accessToken: "token",
      customerCode: "customer",
      merchantId: "merchant",
      apiBaseUrl: "https://enter.tochka.test/",
    });

    const payment = await client.createPaymentLink({
      amountKopecks: 19_900,
      purpose: "Показо: 1 презентация",
      paymentId: "pay1",
      failRedirectUrl: "https://pokazo.test/fail",
      successRedirectUrl: "https://pokazo.test/success",
    });

    expect(payment).toEqual({
      operationId: "op-1",
      paymentUrl: "https://pay.tochka.test/op-1",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://enter.tochka.test/uapi/acquiring/v1.0/payments",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer token" }),
      }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(body.Data).toMatchObject({
      customerCode: "customer",
      merchantId: "merchant",
      amount: "199.00",
      purpose: "Показо: 1 презентация",
      paymentMode: ["card", "sbp"],
      paymentLinkId: "pay1",
      redirectUrl: "https://pokazo.test/success",
      failRedirectUrl: "https://pokazo.test/fail",
      metadata: { payment_id: "pay1" },
    });
  });

  it("wraps unsuccessful responses in TochkaError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("denied", { status: 401 })));
    const client = new HttpTochkaClient({
      accessToken: "bad-token",
      customerCode: "customer",
      apiBaseUrl: "https://enter.tochka.test",
    });

    await expect(
      client.createPaymentLink({
        amountKopecks: 100,
        purpose: "test",
        paymentId: "pay1",
        failRedirectUrl: "https://pokazo.test/fail",
        successRedirectUrl: "https://pokazo.test/success",
      }),
    ).rejects.toBeInstanceOf(TochkaError);
  });
});

describe("parseTochkaWebhook", () => {
  it("parses a JSON body", async () => {
    const event = await parseTochkaWebhook(
      JSON.stringify({ operationId: "op-1", status: "APPROVED", paymentLinkId: "pl-1" }),
    );

    expect(event).toEqual({
      operationId: "op-1",
      paymentLinkId: "pl-1",
      status: "APPROVED",
      verifiedJwt: false,
    });
  });

  it("prefers operationId over payment_id metadata", async () => {
    const event = await parseTochkaWebhook(
      JSON.stringify({ payment_id: "pay-1", operationId: "op-1", status: "APPROVED" }),
    );

    expect(event?.operationId).toBe("op-1");
  });

  it("accepts snake_case JSON fields and rejects invalid JWTs", async () => {
    await expect(
      parseTochkaWebhook(
        JSON.stringify({
          operation_id: "op-2",
          payment_link_id: "pl-2",
          status: "PAID",
        }),
      ),
    ).resolves.toEqual({
      operationId: "op-2",
      paymentLinkId: "pl-2",
      status: "PAID",
      verifiedJwt: false,
    });
    await expect(parseTochkaWebhook("eyJ.invalid.signature")).resolves.toBeNull();
  });

  it("verifies a quoted RS256 JWT without enforcing registered claims", async () => {
    const { privateKey, publicKey } = await generateKeyPair("RS256");
    const token = await new SignJWT({
      operationId: "op-jwt",
      paymentLinkId: "pay-jwt",
      status: "APPROVED",
    })
      .setProtectedHeader({ alg: "RS256" })
      .setIssuer("unexpected-issuer")
      .setAudience("unexpected-audience")
      .setExpirationTime(1)
      .setNotBefore("1 hour")
      .sign(privateKey);

    await expect(verifyTochkaWebhookJwt(token, publicKey)).resolves.toMatchObject({
      operationId: "op-jwt",
      paymentLinkId: "pay-jwt",
    });
  });
});

describe("isTochkaPaidStatus", () => {
  it.each(["PAID", "SUCCESS", "APPROVED", " paid "])("recognizes %s", (status) => {
    expect(isTochkaPaidStatus(status)).toBe(true);
  });

  it("rejects non-paid statuses", () => {
    expect(isTochkaPaidStatus("CREATED")).toBe(false);
  });
});
