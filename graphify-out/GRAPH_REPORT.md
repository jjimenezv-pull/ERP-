# Graph Report - ERP-  (2026-09-12)

## Corpus Check
- 41 files · ~46,428 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 511 nodes · 1171 edges · 22 communities (17 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.8)
- Token cost: 86,472 input · 0 output

## Community Hubs (Navigation)
- UI Primitives & Shared Components
- Auth & Server Actions Core
- Casos Import & Filter UI
- GLPI & Proveedor CSV Import Parsers
- Dependencies & Misc UI
- Dashboard Cards & Auth Pages
- Design Skill & Dashboard History
- Dashboard Metrics
- Package Dependencies
- Auth/Security Session Notes & Middleware
- Login Form & Dashboard Filters
- shadcn Config
- TypeScript Config
- Dev Dependencies
- Casos Table Provider Editing
- ESLint Config
- Next.js Config
- PostCSS Config
- Deploy Process Notes
- Technician Chart Fix Note
- Graphify Staleness Note

## God Nodes (most connected - your core abstractions)
1. `cn()` - 78 edges
2. `react` - 28 edges
3. `lucide-react` - 16 edges
4. `compilerOptions` - 15 edges
5. `design-taste-frontend Skill (.agents copy)` - 15 edges
6. `design-taste-frontend Skill (.claude copy)` - 15 edges
7. `Button` - 14 edges
8. `Card` - 14 edges
9. `CardContent` - 14 edges
10. `CardHeader` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Targeted Evolution vs Full Redesign` --semantically_similar_to--> `Reestructura de la fila de KPIs (2026-09-08)`  [INFERRED] [semantically similar]
  .agents/skills/design-taste-frontend/SKILL.md → resumen.md
- `Default Architecture & Conventions` --semantically_similar_to--> `Next.js`  [INFERRED] [semantically similar]
  .agents/skills/design-taste-frontend/SKILL.md → README.md
- `design-taste-frontend Skill (.agents copy)` --semantically_similar_to--> `design-taste-frontend Skill (.claude copy)`  [INFERRED] [semantically similar]
  .agents/skills/design-taste-frontend/SKILL.md → .claude/skills/design-taste-frontend/SKILL.md
- `Out of Scope (Dashboards/Tables Excluded)` --conceptually_related_to--> `Reestructura de la fila de KPIs (2026-09-08)`  [INFERRED]
  .agents/skills/design-taste-frontend/SKILL.md → resumen.md
- `design-taste-frontend Skill (.claude copy)` --references--> `The Block Library`  [EXTRACTED]
  .claude/skills/design-taste-frontend/SKILL.md → .agents/skills/design-taste-frontend/SKILL.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Bias-Correction Design Rules Group** — _agents_skills_design_taste_frontend_skill_lila_rule, _agents_skills_design_taste_frontend_skill_premium_consumer_palette_ban, _agents_skills_design_taste_frontend_skill_shape_consistency_lock, _agents_skills_design_taste_frontend_skill_eyebrow_restraint, _agents_skills_design_taste_frontend_skill_serif_discipline [EXTRACTED 1.00]
- **Modern SaaS Design-System Options** — _agents_skills_design_taste_frontend_skill_tailwind_v4, _agents_skills_design_taste_frontend_skill_shadcn_ui, _agents_skills_design_taste_frontend_skill_radix_themes [EXTRACTED 1.00]
- **Tarjetas KPI con tamaño de número fijo compartido** — src_components_dashboard_resolution_time_card, src_components_dashboard_sla_kpi_card, src_components_dashboard_backlog_aging_card, resumen_provider_escalation_card [EXTRACTED 1.00]
- **Sistema de login y roles (Fase 1)** — resumen_supabase_auth, resumen_profiles_table, src_middleware, resumen_requireadmin, resumen_usuarios_panel [EXTRACTED 1.00]
- **Cruce proveedor pendiente de completar** — resumen_casos_proveedor_table, resumen_estado_proveedor_enum, resumen_cruce_design, resumen_reinicio_datos_casos [INFERRED 0.85]

## Communities (22 total, 4 thin omitted)

### Community 0 - "UI Primitives & Shared Components"
Cohesion: 0.07
Nodes (48): next, @radix-ui/react-separator, inter, metadata, ESTADO_INTERNO_CLASS, ESTADO_PROVEEDOR_CLASS, ESTADOS_PROVEEDOR, OrderDir (+40 more)

### Community 1 - "Auth & Server Actions Core"
Cohesion: 0.08
Nodes (41): server-only, @supabase/ssr, GET(), CasosPage(), RootLayout(), LoginForm(), LoginPage(), importTareasProveedor() (+33 more)

### Community 2 - "Casos Import & Filter UI"
Cohesion: 0.10
Nodes (34): lucide-react, @radix-ui/react-popover, react, react-day-picker, sonner, importCasos(), CasosPageProps, COLUMNAS_ORDENABLES (+26 more)

### Community 3 - "GLPI & Proveedor CSV Import Parsers"
Cohesion: 0.09
Nodes (42): date-fns, xlsx, Fix de responsividad de la barra de filtros, Casos con estado_proveedor perdido en el reinicio (92579, 92773, 93239, 93437), Tabla casos_proveedor, CasosFilters (componente reutilizado), CasosTable (componente reutilizado), Diseño del cruce flexible por texto (caso_escalado_proveedor ↔ id_tarea) (+34 more)

### Community 4 - "Dependencies & Misc UI"
Cohesion: 0.05
Nodes (38): name, private, scripts, build, dev, lint, start, version (+30 more)

### Community 5 - "Dashboard Cards & Auth Pages"
Cohesion: 0.14
Nodes (25): recharts, Grid 'Estado actual' fila 1 (xl:grid-cols-5), Tamaño fijo compartido de números hero en KPI cards, AcceptInvitePage(), SetPasswordForm(), handleSubmit(), COLOR_BY_ESTADO, COLOR_BY_ESTADO (+17 more)

### Community 6 - "Design Skill & Dashboard History"
Cohesion: 0.08
Nodes (39): AI Tells (Forbidden Patterns), The Block Library, Brief Inference (Read the Room), Context-Aware Proactivity, Dark Mode Protocol, Default Architecture & Conventions, Design Engineering Directives (Bias Correction), Brief -> Design System Map (+31 more)

### Community 7 - "Dashboard Metrics"
Cohesion: 0.11
Nodes (29): DashboardPage(), DashboardPageProps, dynamic, ESTADOS_PROVEEDOR, BacklogAgingCard(), EstadoInternoChart(), EstadoProveedorChart(), OldestOpenCasesList() (+21 more)

### Community 8 - "Package Dependencies"
Cohesion: 0.07
Nodes (27): dependencies, class-variance-authority, clsx, date-fns, lucide-react, next, next-themes, pptxgenjs (+19 more)

### Community 9 - "Auth/Security Session Notes & Middleware"
Cohesion: 0.10
Nodes (20): Leaked Password Protection (Supabase, pendiente, de pago), /login, Hallazgo: control de acceso de Netlify es por cuenta, no por sitio, Tabla profiles (rol admin/viewer, password_set), Purgar anon key del historial de git + rotarla, Falta de rol de solo-lectura en la app, requireAdmin(), RLS abierto en casos + anon key filtrada en git (+12 more)

### Community 10 - "Login Form & Dashboard Filters"
Cohesion: 0.17
Nodes (14): @radix-ui/react-tabs, sendMagicLink(), signInWithPassword(), MagicLinkTab(), handleSubmit(), PasswordTab(), handleSubmit(), DashboardFilters() (+6 more)

### Community 11 - "shadcn Config"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 12 - "TypeScript Config"
Cohesion: 0.11
Nodes (17): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+9 more)

### Community 13 - "Dev Dependencies"
Cohesion: 0.20
Nodes (10): devDependencies, eslint, eslint-config-next, @netlify/plugin-nextjs, postcss, tailwindcss, @types/node, @types/react (+2 more)

### Community 14 - "Casos Table Provider Editing"
Cohesion: 0.28
Nodes (7): updateCasoProveedor(), CasosTable(), handleEscaladoBlur(), handleEstadoProveedorChange(), persist(), cleanText(), formatFecha()

### Community 15 - "ESLint Config"
Cohesion: 0.50
Nodes (3): extends, next/core-web-vitals, next/typescript

### Community 18 - "Deploy Process Notes"
Cohesion: 0.67
Nodes (3): Proceso de deploy (commit → deploy manual del usuario → verificación currentDeploy), Netlify branch deploys (no habilitados), Netlify CLI (netlify-cli@17)

## Knowledge Gaps
- **158 isolated node(s):** `DashboardExportData`, `BadgeProps`, `ButtonProps`, `ToasterProps`, `ChartConfig` (+153 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 182 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Reestructura de la fila de KPIs (2026-09-08)` connect `Design Skill & Dashboard History` to `Dashboard Cards & Auth Pages`?**
  _High betweenness centrality (0.120) - this node is a cross-community bridge._
- **Why does `cn()` connect `UI Primitives & Shared Components` to `Casos Import & Filter UI`, `Dependencies & Misc UI`, `Dashboard Cards & Auth Pages`, `Dashboard Metrics`, `Login Form & Dashboard Filters`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **What connects `DashboardExportData`, `BadgeProps`, `ButtonProps` to the rest of the system?**
  _158 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `UI Primitives & Shared Components` be split into smaller, more focused modules?**
  _Cohesion score 0.07213114754098361 - nodes in this community are weakly interconnected._
- **Should `Auth & Server Actions Core` be split into smaller, more focused modules?**
  _Cohesion score 0.07562008469449485 - nodes in this community are weakly interconnected._
- **Should `Casos Import & Filter UI` be split into smaller, more focused modules?**
  _Cohesion score 0.09502262443438914 - nodes in this community are weakly interconnected._
- **Should `GLPI & Proveedor CSV Import Parsers` be split into smaller, more focused modules?**
  _Cohesion score 0.08599033816425121 - nodes in this community are weakly interconnected._