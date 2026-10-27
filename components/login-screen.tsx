export function LoginScreen({ text }: { text: string }) {
  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center gap-[22px] text-center">
      <h1 className="m-0 text-[30px] leading-[1.15] font-bold tracking-[-0.02em]">Where do you stand?</h1>
      <a
        className="group inline-flex items-center gap-2 rounded-[999px] border border-ink/10 bg-gold px-[21px] py-[10px] text-[15px] font-medium text-ink shadow-[inset_0_1px_2px_rgba(255,255,255,.35),0_3px_3px_-1.5px_rgba(16,24,40,.06),0_1px_1px_rgba(16,24,40,.08)] transition-[filter] hover:brightness-95 hover:no-underline"
        href="/auth/login"
      >
        Continue with 42 <span aria-hidden="true" className="transition-transform duration-150 ease-[ease] group-hover:translate-x-[3px]">→</span>
      </a>
      <p className="m-0 min-h-[18px] text-[13px] text-[#c0392b]">{text}</p>
    </section>
  );
}
