import { sileo } from "sileo";

function toastOpts(message: string, description?: string) {
  return description ? { title: message, description } : { title: message };
}

/** API unificada de toasts del Portal (Sileo) — solo feedback, no confirmaciones. */
export const appToast = {
  success: (message: string, description?: string) =>
    sileo.success(toastOpts(message, description)),

  error: (message: string, description?: string) =>
    sileo.error(toastOpts(message, description)),

  info: (message: string, description?: string) =>
    sileo.info(toastOpts(message, description)),

  warning: (message: string, description?: string) =>
    sileo.warning(toastOpts(message, description)),

  loading: (message: string, description?: string) =>
    sileo.show({ ...toastOpts(message, description), type: "loading", duration: null }),

  dismiss: (id: string) => sileo.dismiss(id),

  clear: (position?: Parameters<typeof sileo.clear>[0]) => sileo.clear(position),

  promise: <T>(
    promise: Promise<T> | (() => Promise<T>),
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: unknown) => string);
    },
  ) => {
    const { success, error } = options;

    return sileo.promise(promise, {
      loading: { title: options.loading },
      success:
        typeof success === "function"
          ? (data: T) => ({ title: success(data) })
          : { title: success },
      error:
        typeof error === "function"
          ? (err: unknown) => ({ title: error(err) })
          : { title: error },
    });
  },
};

export { sileo };
