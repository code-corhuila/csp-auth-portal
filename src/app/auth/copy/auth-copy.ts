/**
 * The Spanish text a person reads on the sign-in and registration screens and in the messages of the session.
 * The pages and services read it from here, so the wording is reviewed in one place and an internationalization
 * library can replace this file without touching them. Identifiers, comments and logs stay in English. Failures
 * of the API are not here: each feature maps its statuses and codes to text in its own `*-error-message.ts`
 * and never shows the English text of the server.
 */
export const COMMON_COPY = {
  email: 'Correo electrónico',
  emailInvalid: 'Ingresa un correo válido.',
  password: 'Contraseña',
  passwordPlaceholder: '••••••••',
} as const;

export const LOGIN_COPY = {
  ...COMMON_COPY,
  title: 'Iniciar sesión',
  emailPlaceholder: 'usuario@cinesync.com',
  passwordRequired: 'Ingresa tu contraseña.',
  submit: 'Ingresar',
  forgotPassword: '¿Olvidaste tu contraseña?',
  noAccount: '¿Aún no tienes cuenta?',
  registerLink: 'Regístrate aquí',
  signedIn: 'Sesión iniciada correctamente.',
} as const;

export const REGISTER_COPY = {
  ...COMMON_COPY,
  title: 'Crear cuenta',
  firstName: 'Nombres',
  firstNamePlaceholder: 'Ej. Juan Carlos',
  firstNameRequired: 'Ingresa tus nombres.',
  lastName: 'Apellidos',
  lastNamePlaceholder: 'Ej. Pérez Gómez',
  lastNameRequired: 'Ingresa tus apellidos.',
  address: 'Dirección',
  addressPlaceholder: 'Ej. Calle 123 #45-67',
  addressRequired: 'Ingresa tu dirección.',
  phone: 'Teléfono',
  phonePlaceholder: 'Ej. 3001234567',
  phoneInvalid: 'Solo dígitos, con + opcional al inicio (7 a 15).',
  emailPlaceholder: 'juan@cinesync.com',
  passwordRequired: 'Ingresa una contraseña.',
  submit: 'Registrarse',
  haveAccount: '¿Ya tienes una cuenta?',
  loginLink: 'Inicia sesión',
  checkEmailTitle: 'Revisa tu correo',
  checkEmail: 'Si el correo puede registrarse, te enviamos un enlace para confirmar tu cuenta. Ábrelo para terminar el registro.',
  checkEmailToast: 'Revisa tu correo para confirmar tu cuenta.',
} as const;

export const CONFIRM_REGISTRATION_COPY = {
  title: 'Confirmar cuenta',
  confirming: 'Confirmando tu cuenta…',
  confirmed: 'Tu cuenta quedó confirmada. Inicia sesión con tus datos.',
  loginLink: 'Ir a iniciar sesión',
  rejected: 'El enlace no es válido o ya venció. Regístrate de nuevo para recibir uno nuevo.',
  registerLink: 'Volver a registrarme',
  alreadyRegistered: 'Este correo ya tiene una cuenta. Inicia sesión.',
} as const;

export const SESSION_COPY = {
  expired: 'Tu sesión expiró. Inicia sesión de nuevo.',
  renewalFailed: 'No pudimos renovar tu sesión por un problema de conexión. Recarga la página para reintentar.',
} as const;
