import { BadRequestException } from '@nestjs/common';

/**
 * 업로드 HTML 기본 검증.
 * - .html 확장자, <form> 요소 최소 1개 (제출 가로채기 대상)
 * - 크기 상한(MAX_HTML_BYTES) 은 multer limits 가 먼저 413 으로 막는다
 * 스크립트 제거(sanitize)는 하지 않음 — 격리는 별도 origin + CSP 로 담당 (ADR-003).
 */
export function validateHtmlUpload(file: Express.Multer.File | undefined): string {
  if (!file) throw new BadRequestException('html file is required (field: file)');
  if (!/\.html?$/i.test(file.originalname)) {
    throw new BadRequestException('only .html files are accepted');
  }
  const html = file.buffer.toString('utf8');
  if (!/<form[\s>]/i.test(html)) {
    throw new BadRequestException('html must contain at least one <form> element');
  }
  return html;
}
