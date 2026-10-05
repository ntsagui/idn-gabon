// Copie de apps/mobile/src/lib/profile-form.ts : même logique sur web et mobile.
// À extraire dans un paquet partagé (voir apps/web/CITIZEN_REDESIGN.md).
export type ProfileForm = {
  firstName: string
  lastName: string
  dateOfBirth: string
  gender: "F" | "M" | "O" | "N"
  birthPlace: string
  nationality: string
}

export function validateProfileForm(
  values: ProfileForm,
  today = new Date().toISOString().slice(0, 10),
): string | null {
  if (
    !values.firstName.trim() ||
    !values.lastName.trim() ||
    !values.birthPlace.trim()
  )
    return "Tous les champs sont obligatoires."
  if (values.nationality.trim().length < 2)
    return "La nationalité est obligatoire."
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.dateOfBirth))
    return "La date de naissance est invalide."
  if (values.dateOfBirth >= today)
    return "La date de naissance doit être antérieure à aujourd’hui."
  return null
}

export function normalizeProfileForm(values: ProfileForm): ProfileForm {
  return {
    ...values,
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    birthPlace: values.birthPlace.trim(),
    nationality: values.nationality.trim().toUpperCase(),
  }
}
