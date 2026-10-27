// the small colored circle before a coalition or a status
export function Dot({ color }: { color?: string }) {
  return <span className="mr-[6px] inline-block size-[7px] rounded-[50%] bg-[#ccc] align-[1px]" style={color ? { backgroundColor: color } : undefined} />;
}
