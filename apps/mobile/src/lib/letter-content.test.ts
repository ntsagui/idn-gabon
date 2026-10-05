import { describe, expect, it } from 'vitest';
import { hasLetterContent, isHtmlLetterBody, letterBodyToText, plainTextToLetterHtml } from './letter-content';

describe('contenu riche des courriers', () => {
  it('convertit le texte en paragraphes HTML sans laisser passer de balises', () => {
    expect(plainTextToLetterHtml('Bonjour <IDN>\nSuite\n\nMerci')).toBe('<p>Bonjour &lt;IDN&gt;<br>Suite</p><p>Merci</p>');
  });

  it('détecte un courrier HTML malgré les espaces initiaux', () => {
    expect(isHtmlLetterBody('  <p>Bonjour</p>')).toBe(true);
    expect(isHtmlLetterBody('Bonjour')).toBe(false);
  });

  it('extrait un texte lisible pour le partage et les réponses', () => {
    expect(letterBodyToText('<h2>Objet</h2><p>A &amp; B<br>Suite</p>')).toBe('Objet\nA & B\nSuite');
  });

  it('refuse le HTML vide mais accepte une image intégrée', () => {
    expect(hasLetterContent('<p><br></p>')).toBe(false);
    expect(hasLetterContent('<p><img src="https://example.test/image.jpg"></p>')).toBe(true);
  });
  it('reconnaît le HTML de l’éditeur même quand il commence par du texte (sinon « <p></p> » s’affiche en clair)', () => {
    expect(isHtmlLetterBody('Message envoyé.<p></p>')).toBe(true);
    expect(isHtmlLetterBody('Bonjour<br>Merci')).toBe(true);
  });

  it('laisse en texte brut un message qui cite un chevron sans balise', () => {
    expect(isHtmlLetterBody('2 < 3 et 5 > 4')).toBe(false);
  });
});
