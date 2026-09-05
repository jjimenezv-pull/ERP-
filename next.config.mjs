/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // El lint ya se corre en local/editor; se desactiva en el build de producción
    // porque el resolver de import de TypeScript de ESLint depende de un binario
    // nativo (unrs-resolver) que puede no resolverse igual en todas las plataformas.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
