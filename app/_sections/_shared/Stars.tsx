import { Icons } from "./Icons";

export function Stars({ count = 5 }: { count?: number }) {
  return <>{Array.from({ length: count }).map((_, i) => <Icons.Star key={i} />)}</>;
}
