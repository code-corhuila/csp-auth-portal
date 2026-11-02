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
  registered: 'Registro exitoso. Ahora inicia sesión con tus datos.',
} as const;

export const SESSION_COPY = {
  expired: 'Tu sesión expiró. Inicia sesión de nuevo.',
  renewalFailed: 'No pudimos renovar tu sesión por un problema de conexión. Recarga la página para reintentar.',
} as const;
