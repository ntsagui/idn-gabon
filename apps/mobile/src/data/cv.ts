/**
 * Données partagées du module iCV mobile :
 *   • 12 thèmes (verbatim SPECS_FEATURE_ICV.md §9)
 *   • 5 outils IA
 *   • Strings UI FR
 *
 * Doit rester aligné avec apps/web/app/(citizen)/icv/_content/* et
 * `CV_THEMES` / `CV_AI_FEATURES` côté backend.
 */

export type CvThemeId =
  | 'modern'
  | 'classic'
  | 'minimalist'
  | 'professional'
  | 'creative'
  | 'startup'
  | 'bold'
  | 'tech'
  | 'academic'
  | 'executive'
  | 'elegant'
  | 'compact';

export type ThemeCategory =
  | 'Classique & Pro'
  | 'Créatif & Moderne'
  | 'Spécialisé';

export interface CvThemeMeta {
  id: CvThemeId;
  label: string;
  desc: string;
  category: ThemeCategory;
  color: string;
  font: 'sans' | 'serif' | 'mono';
}

export const ICV_THEMES: CvThemeMeta[] = [
  { id: 'modern', label: 'Modern', desc: 'Clean & contemporain', category: 'Classique & Pro', color: '#3B82F6', font: 'sans' },
  { id: 'classic', label: 'Classic', desc: 'Intemporel', category: 'Classique & Pro', color: '#6B7280', font: 'serif' },
  { id: 'minimalist', label: 'Minimal', desc: 'Épuré & simple', category: 'Classique & Pro', color: '#1F2937', font: 'sans' },
  { id: 'professional', label: 'Pro', desc: 'Formel & sérieux', category: 'Classique & Pro', color: '#0F766E', font: 'sans' },
  { id: 'creative', label: 'Créatif', desc: 'Artistique', category: 'Créatif & Moderne', color: '#EC4899', font: 'sans' },
  { id: 'startup', label: 'Startup', desc: 'Tech & dynamique', category: 'Créatif & Moderne', color: '#F97316', font: 'sans' },
  { id: 'bold', label: 'Bold', desc: 'Audacieux', category: 'Créatif & Moderne', color: '#7C3AED', font: 'sans' },
  { id: 'tech', label: 'Tech', desc: 'IT & Digital', category: 'Créatif & Moderne', color: '#06B6D4', font: 'mono' },
  { id: 'academic', label: 'Academic', desc: 'Universitaire', category: 'Spécialisé', color: '#0369A1', font: 'serif' },
  { id: 'executive', label: 'Executive', desc: 'Direction', category: 'Spécialisé', color: '#1E3A5F', font: 'serif' },
  { id: 'elegant', label: 'Elegant', desc: 'Raffiné', category: 'Spécialisé', color: '#9D4EDD', font: 'serif' },
  { id: 'compact', label: 'Compact', desc: 'Dense & efficace', category: 'Spécialisé', color: '#059669', font: 'sans' },
];

export const THEME_CATEGORIES: ThemeCategory[] = [
  'Classique & Pro',
  'Créatif & Moderne',
  'Spécialisé',
];

export function getCvThemeById(id: string | undefined | null): CvThemeMeta {
  if (!id) return ICV_THEMES[0]!;
  return ICV_THEMES.find((t) => t.id === id) ?? ICV_THEMES[0]!;
}

export const ICV_ACCENT = '#EC4899';
export const ICV_ACCENT_SOFT_LIGHT = '#FCE7F3';
export const ICV_ACCENT_SOFT_DARK = '#2A1426';

// ─────────────────────────────────────────────────────────────────────────
// AI tools
// ─────────────────────────────────────────────────────────────────────────

export type AiToolId =
  | 'improve_summary'
  | 'suggest_skills'
  | 'optimize_job'
  | 'generate_letter'
  | 'ats_check';

export interface AiToolMeta {
  id: AiToolId;
  label: string;
  desc: string;
  color: string;
  bgLight: string;
  bgDark: string;
}

export const ICV_AI_TOOLS: AiToolMeta[] = [
  { id: 'improve_summary', label: 'Améliorer le Profil', desc: 'Reformule ton résumé', color: '#a855f7', bgLight: '#F3E8FF', bgDark: '#2A1542' },
  { id: 'suggest_skills', label: 'Suggérer Compétences', desc: 'Basé sur tes expériences', color: '#3b82f6', bgLight: '#DBEAFE', bgDark: '#0F2640' },
  { id: 'optimize_job', label: 'Optimiser pour Poste', desc: 'Adapte-le à une offre', color: '#f97316', bgLight: '#FFEDD5', bgDark: '#2A1A0E' },
  { id: 'generate_letter', label: 'Lettre de Motivation', desc: 'Génère-la automatiquement', color: '#22c55e', bgLight: '#DCFCE7', bgDark: '#0F2818' },
  { id: 'ats_check', label: 'Score ATS', desc: 'Compatibilité recruteurs', color: '#f59e0b', bgLight: '#FEF3C7', bgDark: '#2A1F0A' },
];

// ─────────────────────────────────────────────────────────────────────────
// Strings UI (FR)
// ─────────────────────────────────────────────────────────────────────────

export const icvStrings = {
  title: 'iCV',
  subtitle: 'Crée et personnalise ton CV professionnel',
  loading: 'Chargement…',
  errors: {
    loadFailed: 'Impossible de charger ce CV.',
    saveFailed: 'Échec de l\'enregistrement.',
    quotaIa: 'Quota IA quotidien atteint (10/jour). Réessaie demain.',
    aiFailed: 'L’outil IA a échoué. Réessaie.',
  },
  selector: {
    principal: 'Principal',
    sourceManual: 'Manuel',
    sourceOnboarding: 'Initial',
    sourceAi: 'Variant IA',
    sourceImport: 'Importé',
    newCv: '+ Nouveau CV',
    viewAll: 'Voir tous mes CV',
  },
  list: {
    title: 'Mes CV',
    limit: 'Limite de 10 CV atteinte',
    newCv: '+ Nouveau CV',
    actions: {
      open: 'Ouvrir',
      rename: 'Renommer',
      duplicate: 'Dupliquer',
      setDefault: 'Définir comme principal',
      download: 'Télécharger en PDF',
      remove: 'Supprimer',
    },
    cannotDeleteDefault:
      'Impossible de supprimer le CV principal. Désigne d’abord un autre CV comme principal.',
    confirmRemoveTitle: 'Supprimer ce CV ?',
    confirmRemove: (name: string) =>
      `« ${name} » sera supprimé (soft delete — restaurable plus tard).`,
    empty: 'Tu n’as pas encore de CV.',
    emptyCta: 'Démarrer mon premier CV',
  },
  create: {
    title: 'Créer un CV',
    nameLabel: 'Nom du CV',
    namePh: 'ex. CV Tech, CV Direction…',
    copyFromLabel: 'Partir d\'un CV existant',
    copyFromEmpty: 'CV vierge',
    cancel: 'Annuler',
    create: 'Créer',
  },
  rename: {
    title: 'Renommer le CV',
    nameLabel: 'Nouveau nom',
    cancel: 'Annuler',
    save: 'Enregistrer',
  },
  actions: {
    edit: 'Modifier',
    import: 'Importer',
    pdf: 'PDF',
    preparing: 'Préparation…',
    pdfReady: 'PDF prêt',
    pdfReadyDesc: 'Le téléchargement va démarrer.',
    pdfRateLimit: 'Limite d’exports atteinte. Réessaie demain.',
    pdfFailed: 'Échec de la génération.',
  },
  themes: {
    title: 'Choisir un thème',
    galleryTitle: 'Galerie des thèmes',
    galleryDesc: '12 mises en page, 3 catégories.',
    apply: (label: string) => `Appliquer ${label}`,
    activeTheme: 'Thème actif',
  },
  ai: {
    title: 'Options IA',
    cardTitle: 'Suggestion de l\'IA',
    inProgress: 'Génération en cours…',
    accept: 'Accepter',
    ignore: 'Ignorer',
    addSkill: 'Ajouter',
    copyLetter: 'Copier',
  },
  optimize: {
    title: 'Optimiser pour un poste',
    desc: 'L\'IA crée un nouveau CV adapté à l\'offre.',
    offerLabel: 'Texte de l\'offre',
    offerPh: 'Colle ici la description du poste visé…',
    nameLabel: 'Nom du nouveau CV (optionnel)',
    namePh: 'Variant — Chef de projet',
    cancel: 'Annuler',
    submit: 'Optimiser',
    running: 'Optimisation en cours…',
    success: 'CV optimisé créé',
  },
  ats: {
    title: 'Score ATS',
    desc: 'Compatibilité avec les systèmes de recrutement',
    resultEyebrow: 'RÉSULTAT',
    resultGood: 'Bien optimisé',
    resultMid: 'À améliorer',
    resultBad: 'Faiblement optimisé',
    close: 'Fermer',
  },
  import: {
    title: 'Importer un CV',
    desc: 'PDF ou image — 5 Mo max.',
    pick: 'Choisir un fichier',
    pickedFile: (n: string) => `Sélectionné : ${n}`,
    modeLabel: 'Que faire ?',
    modeNew: 'Créer un nouveau CV',
    modeMerge: 'Fusionner avec le CV actif',
    cancel: 'Annuler',
    submit: 'Lancer l\'import',
    importing: 'Import en cours…',
    success: 'Import réussi',
    successDesc: 'Les données ont été importées.',
    failed: 'L\'import a échoué.',
    tooLarge: 'Le fichier dépasse 5 Mo.',
    unsupported: 'Format non supporté. Utilise un PDF ou une image.',
  },
  dashboard: {
    title: 'Tableau de bord',
    score: 'SCORE',
    levelExpert: 'Niveau Expert',
    levelGood: 'Niveau Bon',
    levelBeginner: 'Niveau Débutant',
    descExpert: 'Profil attractif',
    descGood: 'Bon profil — quelques améliorations possibles',
    descBeginner: 'Profil à compléter',
    suggestions: 'SUGGESTIONS',
    sections: 'SECTIONS DU CV',
    impactHigh: 'Élevé',
    impactMedium: 'Moyen',
    impactLow: 'Faible',
    editCv: 'Modifier mon CV',
    changeTheme: 'Changer de thème',
  },
  editor: {
    eyebrow: 'iCV · ÉDITION',
    cancel: 'Annuler',
    save: 'Enregistrer',
    delete: 'Supprimer',
    aiImprove: 'Améliorer avec l\'IA',
    sections: {
      info: 'Mes informations',
      experienceAdd: 'Ajouter une expérience',
      experienceEdit: 'Modifier une expérience',
      educationAdd: 'Ajouter une formation',
      educationEdit: 'Modifier une formation',
      skillAdd: 'Ajouter une compétence',
      skillEdit: 'Modifier une compétence',
      languageAdd: 'Ajouter une langue',
      languageEdit: 'Modifier une langue',
    },
    fields: {
      firstName: 'Prénom',
      lastName: 'Nom',
      email: 'Email',
      phone: 'Téléphone',
      address: 'Adresse',
      summary: 'Résumé professionnel',
      summaryHint: '50-300 caractères pour un score optimal.',
      linkedinUrl: 'LinkedIn (URL)',
      portfolioUrl: 'Portfolio (URL)',
      title: 'Intitulé du poste',
      company: 'Entreprise',
      startDate: 'Date de début',
      endDate: 'Date de fin',
      current: 'Poste actuel',
      description: 'Description',
      degree: 'Diplôme',
      school: 'Établissement',
      year: 'Année',
      skillName: 'Nom',
      skillLevel: 'Niveau',
      languageName: 'Langue',
      languageLevel: 'Niveau',
    },
  },
} as const;

export const SKILL_LEVELS = [
  'Débutant',
  'Intermédiaire',
  'Avancé',
  'Expert',
] as const;

export const LANG_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Natif'] as const;
