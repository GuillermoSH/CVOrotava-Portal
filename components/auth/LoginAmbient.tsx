/**
 * Fondo ambiental del login — orbes de brillo a la deriva en vez de las
 * partículas de Team-Manager. Solo CSS (keyframes ya portados en globals.css),
 * sin dependencias nuevas. `motion-safe:` desactiva la animación si el
 * usuario prefiere movimiento reducido.
 */
export function LoginAmbient() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div
        className="absolute left-1/2 top-[-14%] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full opacity-70 blur-3xl motion-safe:animate-pulse-slow"
        style={{ background: "radial-gradient(circle, var(--color-brand-soft), transparent 70%)" }}
      />
      <div
        className="absolute -left-28 bottom-[-12%] h-72 w-72 rounded-full opacity-40 blur-3xl motion-safe:animate-float"
        style={{ background: "radial-gradient(circle, var(--color-brand), transparent 70%)" }}
      />
      <div
        className="absolute -right-16 top-1/3 h-64 w-64 rounded-full opacity-30 blur-3xl motion-safe:animate-float"
        style={{
          background: "radial-gradient(circle, var(--color-brand-strong), transparent 70%)",
          animationDelay: "1.4s",
        }}
      />
    </div>
  );
}
