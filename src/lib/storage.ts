/**
 * Acceso defensivo a localStorage.
 *
 * El acceso a `window.localStorage` puede lanzar SecurityError incluso antes
 * de llamar a getItem/setItem (por ejemplo, cuando cookies están bloqueadas).
 * Estas funciones concentran ese caso y el de cuota agotada para que los
 * stores puedan seguir funcionando en memoria.
 */

export type StorageFailure = "unavailable" | "read" | "write" | "quota";

export interface StorageReadResult {
  value: string | null;
  failure: StorageFailure | null;
}

export interface StorageWriteResult {
  ok: boolean;
  failure: StorageFailure | null;
}

function failureName(error: unknown): string {
  if (error && typeof error === "object" && "name" in error) {
    return String(error.name);
  }
  return "Error";
}

function failureCode(error: unknown): number | null {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "number"
  ) {
    return error.code;
  }
  return null;
}

function isQuotaError(error: unknown): boolean {
  const name = failureName(error);
  const code = failureCode(error);
  return (
    name === "QuotaExceededError" ||
    name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    code === 22
  );
}

function isUnavailableError(error: unknown): boolean {
  return failureName(error) === "SecurityError";
}

export function readLocalStorage(key: string): StorageReadResult {
  if (typeof window === "undefined") {
    return { value: null, failure: "unavailable" };
  }

  try {
    const storage = window.localStorage;
    if (!storage) return { value: null, failure: "unavailable" };
    return { value: storage.getItem(key), failure: null };
  } catch (error) {
    console.warn(`No se pudo leer ${key} de localStorage.`, failureName(error));
    return {
      value: null,
      failure: isUnavailableError(error) ? "unavailable" : "read",
    };
  }
}

export function writeLocalStorage(key: string, value: string): StorageWriteResult {
  if (typeof window === "undefined") {
    return { ok: false, failure: "unavailable" };
  }

  try {
    const storage = window.localStorage;
    if (!storage) return { ok: false, failure: "unavailable" };
    storage.setItem(key, value);
    return { ok: true, failure: null };
  } catch (error) {
    console.warn(`No se pudo guardar ${key} en localStorage.`, failureName(error));
    return {
      ok: false,
      failure: isUnavailableError(error)
        ? "unavailable"
        : isQuotaError(error)
          ? "quota"
          : "write",
    };
  }
}

export function removeLocalStorage(key: string): StorageWriteResult {
  if (typeof window === "undefined") {
    return { ok: false, failure: "unavailable" };
  }

  try {
    const storage = window.localStorage;
    if (!storage) return { ok: false, failure: "unavailable" };
    storage.removeItem(key);
    return { ok: true, failure: null };
  } catch (error) {
    console.warn(`No se pudo eliminar ${key} de localStorage.`, failureName(error));
    return {
      ok: false,
      failure: isUnavailableError(error) ? "unavailable" : "write",
    };
  }
}
