/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // El lint ya se corre en local/editor; se desactiva en el build de producción
    // porque el resolver de import de TypeScript de ESLint depende de un binario
    // nativo (unrs-resolver) que puede no resolverse igual en todas las plataformas.
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      // pptxgenjs importa módulos de Node con el esquema "node:" (para su modo
      // servidor, que no se usa aquí). Webpack no resuelve ese esquema en el
      // bundle de cliente, así que se le quita el prefijo y luego se resuelve
      // a vacío con los fallbacks de abajo.
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
          resource.request = resource.request.replace(/^node:/, "");
        })
      );
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        https: false,
        path: false,
        os: false,
      };
    }
    return config;
  },
};

export default nextConfig;
