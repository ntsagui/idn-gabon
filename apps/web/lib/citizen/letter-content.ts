// Copie de apps/mobile/src/lib/letter-content.ts : même logique sur web et mobile.
// À extraire dans un paquet partagé (voir apps/web/CITIZEN_REDESIGN.md).
// L'éditeur riche (contenteditable) peut produire « texte<p></p> » : le corps
// est du HTML dès qu'il contient une balise connue, pas seulement s'il commence par « < ».
const LETTER_TAG = /<\/?(p|br|div|span|b|strong|i|em|u|s|ul|ol|li|a|h[1-6]|blockquote|img)\b[^>]*>/i;

export function isHtmlLetterBody(body: string): boolean {
  return body.trimStart().startsWith('<') || LETTER_TAG.test(body);
}

export function plainTextToLetterHtml(value: string): string {
  const escaped = value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return escaped.split(/\n{2,}/).map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`).join('');
}

export function letterBodyToText(body: string): string {
  return body
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function hasLetterContent(body: string): boolean {
  return letterBodyToText(body).length > 0 || /<img\b/i.test(body);
}
