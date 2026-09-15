/** 폼 아래 에러 한 줄. role=alert 로 테스트·스크린리더가 잡는다. */
export function ErrorText({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return <p role="alert" className="text-sm text-destructive">{children}</p>;
}
