export function LoginScreen({ text }: { text: string }) {
  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center gap-[22px] text-center">
      <h1 className="m-0 text-[30px] leading-[1.15] font-bold tracking-[-0.02em]">Where do you stand?</h1>
      <a
        className="group inline-flex items-center gap-2 rounded-[999px] bg-[#1a1a1a] px-[22px] py-[11px] text-[15px] font-medium text-white hover:bg-[#333] hover:no-underline"
        href="/auth/login"
      >
        Continue with 42 <span aria-hidden="true" className="transition-transform duration-150 ease-[ease] group-hover:translate-x-[3px]">→</span>
      </a>
      <p className="m-0 min-h-[18px] text-[13px] text-[#c0392b]">{text}</p>
    </section>
  );
}
