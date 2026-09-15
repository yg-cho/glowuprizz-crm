/** 라우트 전환 중 표시. Section 단위 로딩은 각 섹션이 처리한다. */
export default function AdminLoading() {
  return <p className="text-sm text-muted-foreground" aria-busy>불러오는 중…</p>;
}
