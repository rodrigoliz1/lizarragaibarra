export type Lawyer = {
  slug: string;
  name: string;
  initials: string;
  role: string;
  primaryArea: string;
  areas: readonly string[];
  biography: readonly string[];
  education: readonly string[];
  focus: readonly string[];
  email: string;
  phone: string;
  whatsapp: string;
  image?: string;
  imageAlt?: string;
};
export const lawyers: readonly Lawyer[] = [
  {
    slug: "rodrigo-lizarraga-camacho",
    name: "Rodrigo Lizárraga Camacho",
    initials: "RL",
    role: "Socio",
    primaryArea: "Administrativo, fiscal y constitucional",
    areas: ["Constitucional", "Administrativo", "Solución de controversias"],
    biography: [
      "Egresado de la Licenciatura en Derecho de la Universidad Panamericana, campus Guadalajara.",
      "Su práctica se desarrolla en litigio y solución de controversias, con especial atención al derecho administrativo, fiscal y constitucional.",
      "Su trabajo comprende el análisis de asuntos, la investigación jurídica, la elaboración de proyectos y el seguimiento de procedimientos. Su enfoque parte de la precisión en la redacción y la construcción de estrategias jurídicas sustentadas en los hechos y documentos de cada asunto.",
    ],
    education: ["Egresado de la Universidad Panamericana, campus Guadalajara."],
    focus: [
      "Derecho administrativo, fiscal y constitucional",
      "Análisis e investigación jurídica",
      "Estrategia y seguimiento procesal",
    ],
    email: "r.lizarraga@lizarragaibarra.com",
    phone: "6692122543",
    whatsapp: "526692122543",
    image: "/images/team/rodrigo.png",
    imageAlt: "Rodrigo Lizárraga Camacho, socio de Lizárraga & Ibarra Abogados",
  },
  {
    slug: "felipe-ibarra-ibarra",
    name: "Felipe Ibarra Ibarra",
    initials: "FI",
    role: "Socio",
    primaryArea: "Civil y mercantil",
    areas: ["Civil", "Mercantil", "Solución de controversias"],
    biography: [
      "Egresado de la Licenciatura en Derecho de la Universidad Panamericana, campus Guadalajara.",
      "Su práctica se orienta al derecho civil y mercantil, con participación en investigación jurídica, análisis de contratos, elaboración de proyectos y seguimiento de controversias.",
      "Su enfoque combina la atención al detalle con el análisis de las relaciones contractuales y patrimoniales. Participa en la construcción de soluciones jurídicas claras, en la negociación de adeudos y en el seguimiento de procedimientos de recuperación y ejecución de garantías.",
    ],
    education: ["Egresado de la Universidad Panamericana, campus Guadalajara."],
    focus: [
      "Litigio civil y mercantil",
      "Recuperación de cartera y negociación de adeudos",
      "Contratos, garantías y controversias patrimoniales",
    ],
    email: "f.ibarra@lizarragaibarra.com",
    phone: "6674899183",
    whatsapp: "526674899183",
    image: "/images/team/felipe.png",
    imageAlt: "Felipe Ibarra Ibarra, socio de Lizárraga & Ibarra Abogados",
  },
];
export function getLawyerBySlug(slug: string) {
  return lawyers.find((lawyer) => lawyer.slug === slug);
}
export function formatPhone(phone: string) {
  return phone.replace(/^(\d{3})(\d{3})(\d{4})$/, "$1 $2 $3");
}
