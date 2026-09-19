import { defineConfig } from 'vite';

const githubRepository = process.env.GITHUB_REPOSITORY?.split('/').pop();

export default defineConfig({
  // GitHub Pages sirve cada proyecto bajo /nombre-del-repositorio/.
  // Cloudflare Pages y el servidor local lo sirven desde la raíz.
  base: process.env.GITHUB_ACTIONS && githubRepository
    ? `/${githubRepository}/`
    : '/',
});
