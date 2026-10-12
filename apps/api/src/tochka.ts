import { compactVerify, importJWK, type JWK } from "jose";
import { config } from "./env.js";

const TOCHKA_PUBLIC_JWK: JWK = {
  kty: "RSA",
  alg: "RS256",
  use: "sig",
  e: "AQAB",
  n:
    "rwm77av7GIttq-JF1itEgLCGEZW_zz16RlUQVYlLbJtyRSu61fCec_rroP6PxjXU2uLzUOaGaLgA" +
    "PeUZAJrGuVp9nryKgbZceHckdHDYgJd9TsdJ1MYUsXaOb9joN9vmsCscBx1lwSlFQyNQsHUsrjuD" +
    "k-opf6RCuazRQ9gkoDCX70HV8WBMFoVm-YWQKJHZEaIQxg_DU4gMFyKRkDGKsYKA0POL-UgWA1qk" +
    "g6nHY5BOMKaqxbc5ky87muWB5nNk4mfmsckyFv9j1gBiXLKekA_y4UwG2o1pbOLpJS3bP_c95rm4" +
    "M9ZBmGXqfOQhbjz8z-s9C11i-jmOQ2ByohS-ST3E5sqBzIsxxrxyQDTw--bZNhzpbciyYW4Gfkkq" +
    "yeYoOPd_84jPTBDKQXssvj8ZOj2XboS77tvEO1n1WlwUzh8HPCJod5_fEgSXuozpJtOggXBv0C2p" +
    "s7yXlDZf-7Jar0UYc_NJEHJF-xShlqd6Q3sVL02PhSCM-ibn9DN9BKmD",
};

const PAID_STATUSES = new Set(["PAID", "SUCCESS", "APPROVED"]);
const tochkaPublicKey = importJWK(TOCHKA_PUBLIC_JWK, "RS256");

export class TochkaError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "TochkaError";
  }
}

export type TochkaPayment = {
  operationId: string;
  paymentUrl: string;
};

export type TochkaWebhookEvent = {
  operationId: string | null;
  paymentLinkId: string | null;
  status: string;
  verifiedJwt: boolean;
};

export type CreatePaymentLinkOptions = {
  amountKopecks: number;
  purpose: string;
  paymentId: string;
  failRedirectUrl: string;
  successRedirectUrl: string;
};

export interface TochkaClient {
  createPaymentLink(opts: CreatePaymentLinkOptions): Promise<TochkaPayment>;
}

export class StubTochkaClient implements TochkaClient {
  async createPaymentLink(opts: CreatePaymentLinkOptions): Promise<TochkaPayment> {
    const operationId = `stub-${opts.paymentId}`;
    return {
      operationId,
      paymentUrl: `https://stub.tochka.local/pay/${encodeURIComponent(operationId)}`,
    };
  }
}

type HttpTochkaClientOptions = {
  accessToken?: string;
  merchantId?: string;
  customerCode?: string;
  apiBaseUrl?: string;
};

export class HttpTochkaClient implements TochkaClient {
  private readonly accessToken: string;
  private readonly merchantId: string;
  private customerCode: string;
  private readonly apiBaseUrl: string;
  private customerCodePromise: Promise<string> | null = null;

  constructor(options: HttpTochkaClientOptions = {}) {
    this.accessToken = (options.accessToken ?? config.tochkaAccessToken).trim();
    this.merchantId = (options.merchantId ?? config.tochkaMerchantId).trim();
    this.customerCode = (options.customerCode ?? config.tochkaCustomerCode).trim();
    this.apiBaseUrl = (options.apiBaseUrl ?? config.tochkaApiBaseUrl).replace(/\/+$/, "");
  }

  async createPaymentLink(opts: CreatePaymentLinkOptions): Promise<TochkaPayment> {
    const customerCode = await this.resolveCustomerCode();
    const data: Record<string, unknown> = {
      customerCode,
      amount: (opts.amountKopecks / 100).toFixed(2),
      purpose: opts.purpose,
      paymentMode: ["card", "sbp"],
      paymentLinkId: opts.paymentId,
      redirectUrl: opts.successRedirectUrl,
      failRedirectUrl: opts.failRedirectUrl,
      metadata: { payment_id: opts.paymentId },
    };
    if (this.merchantId) data.merchantId = this.merchantId;

    const root = await this.requestJson("/uapi/acquiring/v1.0/payments", {
      method: "POST",
      body: JSON.stringify({ Data: data }),
    });
    const responseData = isRecord(root.Data) ? root.Data : null;
    const operationId = stringOrNull(responseData?.operationId);
    const paymentUrl = stringOrNull(responseData?.paymentLink ?? responseData?.paymentUrl);
    if (!operationId || !paymentUrl) {
      throw new TochkaError("Точка не вернула operationId/paymentLink");
    }
    return { operationId, paymentUrl };
  }

  private async resolveCustomerCode(): Promise<string> {
    if (this.customerCode) return this.customerCode;
    this.customerCodePromise ??= this.fetchCustomerCode();
    try {
      this.customerCode = await this.customerCodePromise;
      return this.customerCode;
    } catch (error) {
      this.customerCodePromise = null;
      throw error;
    }
  }

  private async fetchCustomerCode(): Promise<string> {
    const root = await this.requestJson("/uapi/open-banking/v1.0/customers");
    const data = isRecord(root.Data) ? root.Data : null;
    const direct = stringOrNull(data?.customerCode);
    if (direct) return direct;

    const rawCustomers = data?.Customer;
    const customers = Array.isArray(rawCustomers)
      ? rawCustomers.filter(isRecord)
      : isRecord(rawCustomers)
        ? [rawCustomers]
        : [];
    const business = customers.find(
      (customer) => stringOrNull(customer.customerType)?.toLowerCase() === "business",
    );
    const businessCode = stringOrNull(business?.customerCode);
    if (businessCode) return businessCode;
    if (customers.length === 1) {
      const onlyCode = stringOrNull(customers[0]?.customerCode);
      if (onlyCode) return onlyCode;
    }
    throw new TochkaError("В Точке не найден однозначный customerCode");
  }

  private async requestJson(
    path: string,
    init: Pick<RequestInit, "method" | "body"> = {},
  ): Promise<Record<string, unknown>> {
    let response: Response;
    try {
      response = await fetch(`${this.apiBaseUrl}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      throw new TochkaError("Не удалось связаться с Точкой", { cause: error });
    }
    if (!response.ok) {
      const errBody = (await response.text().catch(() => "")).slice(0, 400);
      console.error(
        `[billing] event=tochka_http_error method=${init.method ?? "GET"} path=${path} status=${response.status} body=${errBody}`,
      );
      throw new TochkaError(`Запрос к Точке завершился с HTTP ${response.status}`);
    }
    try {
      const body: unknown = await response.json();
      if (!isRecord(body)) throw new Error("Response is not an object");
      return body;
    } catch (error) {
      throw new TochkaError("Некорректный ответ Точки", { cause: error });
    }
  }
}

export function getTochkaClient(): TochkaClient {
  return config.tochkaAccessToken.trim() ? new HttpTochkaClient() : new StubTochkaClient();
}

export async function parseTochkaWebhook(rawBody: string): Promise<TochkaWebhookEvent | null> {
  const text = rawBody.trim();
  const token = text.replace(/^"|"$/g, "");
  if (token.startsWith("{")) return parseJsonWebhook(token);
  if (!token.startsWith("eyJ")) return null;
  try {
    const payload = await verifyTochkaWebhookJwt(token);
    return webhookEventFrom(payload, true);
  } catch {
    return null;
  }
}

export async function verifyTochkaWebhookJwt(
  token: string,
  key?: Awaited<ReturnType<typeof importJWK>>,
): Promise<Record<string, unknown>> {
  const { payload } = await compactVerify(token, key ?? await tochkaPublicKey, {
    algorithms: ["RS256"],
  });
  const decoded: unknown = JSON.parse(new TextDecoder().decode(payload));
  if (!isRecord(decoded)) throw new Error("JWT payload is not an object");
  return decoded;
}

export function isTochkaPaidStatus(status: string): boolean {
  return PAID_STATUSES.has(status.trim().toUpperCase());
}

function parseJsonWebhook(text: string): TochkaWebhookEvent | null {
  try {
    const data: unknown = JSON.parse(text);
    return isRecord(data) ? webhookEventFrom(data, false) : null;
  } catch {
    return null;
  }
}

function webhookEventFrom(
  data: Record<string, unknown>,
  verifiedJwt: boolean,
): TochkaWebhookEvent {
  return {
    operationId: stringOrNull(data.operationId ?? data.operation_id),
    paymentLinkId: stringOrNull(
      data.payment_link_id ?? data.paymentLinkId ?? data.payment_linkId,
    ),
    status: stringOrNull(data.status) ?? "unknown",
    verifiedJwt,
  };
}

function stringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const result = String(value).trim();
  return result || null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
