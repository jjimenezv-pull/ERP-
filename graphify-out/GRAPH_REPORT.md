# Graph Report - ERP-  (2026-09-18)

## Corpus Check
- 7 files · ~46,569 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 513 nodes · 1177 edges · 26 communities (20 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Auth & Server Actions Core
- Casos Table UI & Editing
- Dashboard Page & Recharts
- GLPI/Proveedor Import & Session Notes
- Shared UI Deps & Primitives
- Design Taste Skill Content
- Package Dependencies List
- Login Flow & Magic Link
- Security & Access Control Notes
- Package Metadata & Lint Deps
- Dashboard Metrics Computation
- shadcn Component Aliases Config
- TypeScript Config
- Dev Dependencies
- Root Layout & Next Theming
- Casos Table Provider Editing
- NPM Scripts
- ESLint Config
- PPTX Export
- Next.js Config
- PostCSS Config
- Tailwind Config
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
- `design-taste-frontend Skill (.claude copy)` --references--> `The Block Library`  [EXTRACTED]
  .claude/skills/design-taste-frontend/SKILL.md → .agents/skills/design-taste-frontend/SKILL.md
- `design-taste-frontend Skill (.claude copy)` --references--> `Brief Inference (Read the Room)`  [EXTRACTED]
  .claude/skills/design-taste-frontend/SKILL.md → .agents/skills/design-taste-frontend/SKILL.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Bias-Correction Design Rules Group** — _agents_skills_design_taste_frontend_skill_lila_rule, _agents_skills_design_taste_frontend_skill_premium_consumer_palette_ban, _agents_skills_design_taste_frontend_skill_shape_consistency_lock, _agents_skills_design_taste_frontend_skill_eyebrow_restraint, _agents_skills_design_taste_frontend_skill_serif_discipline [EXTRACTED 1.00]
- **Modern SaaS Design-System Options** — _agents_skills_design_taste_frontend_skill_tailwind_v4, _agents_skills_design_taste_frontend_skill_shadcn_ui, _agents_skills_design_taste_frontend_skill_radix_themes [EXTRACTED 1.00]
- **Sistema de login y roles (Fase 1)** — resumen_supabase_auth, resumen_profiles_table, src_middleware, resumen_requireadmin, resumen_usuarios_panel [EXTRACTED 1.00]
- **Tarjetas KPI con tamaño de número fijo compartido** — src_components_dashboard_resolution_time_card, src_components_dashboard_sla_kpi_card, src_components_dashboard_backlog_aging_card, resumen_provider_escalation_card [EXTRACTED 1.00]
- **Cruce proveedor pendiente de completar** — resumen_casos_proveedor_table, resumen_estado_proveedor_enum, resumen_cruce_design, resumen_reinicio_datos_casos [INFERRED 0.85]

## Communities (26 total, 5 thin omitted)

### Community 0 - "Auth & Server Actions Core"
Cohesion: 0.07
Nodes (45): server-only, @supabase/ssr, GET(), importCasos(), CasosPage(), CasosPageProps, COLUMNAS_ORDENABLES, COLUMNAS_TEXTO_BUSCABLES (+37 more)

### Community 1 - "Casos Table UI & Editing"
Cohesion: 0.08
Nodes (44): @radix-ui/react-dropdown-menu, @radix-ui/react-separator, ESTADO_INTERNO_CLASS, ESTADO_PROVEEDOR_CLASS, ESTADOS_PROVEEDOR, OrderDir, SORTABLE_COLUMNS, SortableColumn (+36 more)

### Community 2 - "Dashboard Page & Recharts"
Cohesion: 0.10
Nodes (37): recharts, Grid 'Estado actual' fila 1 (xl:grid-cols-5), Tamaño fijo compartido de números hero en KPI cards, AcceptInvitePage(), DashboardPageProps, dynamic, ESTADOS_PROVEEDOR, SetPasswordForm() (+29 more)

### Community 3 - "GLPI/Proveedor Import & Session Notes"
Cohesion: 0.08
Nodes (45): xlsx, Fix de responsividad de la barra de filtros, Casos con estado_proveedor perdido en el reinicio (92579, 92773, 93239, 93437), Tabla casos_proveedor, CasosFilters (componente reutilizado), CasosTable (componente reutilizado), Diseño del cruce flexible por texto (caso_escalado_proveedor ↔ id_tarea), escaladosPendientes (+37 more)

### Community 4 - "Shared UI Deps & Primitives"
Cohesion: 0.12
Nodes (29): class-variance-authority, lucide-react, @radix-ui/react-label, @radix-ui/react-popover, react, react-day-picker, sonner, COLUMNAS_BUSCABLES (+21 more)

### Community 5 - "Design Taste Skill Content"
Cohesion: 0.08
Nodes (39): AI Tells (Forbidden Patterns), The Block Library, Brief Inference (Read the Room), Context-Aware Proactivity, Dark Mode Protocol, Default Architecture & Conventions, Design Engineering Directives (Bias Correction), Brief -> Design System Map (+31 more)

### Community 6 - "Package Dependencies List"
Cohesion: 0.07
Nodes (27): dependencies, class-variance-authority, clsx, date-fns, lucide-react, next, next-themes, pptxgenjs (+19 more)

### Community 7 - "Login Flow & Magic Link"
Cohesion: 0.16
Nodes (15): date-fns, @radix-ui/react-tabs, sendMagicLink(), signInWithPassword(), MagicLinkTab(), handleSubmit(), PasswordTab(), handleSubmit() (+7 more)

### Community 8 - "Security & Access Control Notes"
Cohesion: 0.10
Nodes (20): Leaked Password Protection (Supabase, pendiente, de pago), /login, Hallazgo: control de acceso de Netlify es por cuenta, no por sitio, Tabla profiles (rol admin/viewer, password_set), Purgar anon key del historial de git + rotarla, Falta de rol de solo-lectura en la app, requireAdmin(), RLS abierto en casos + anon key filtrada en git (+12 more)

### Community 9 - "Package Metadata & Lint Deps"
Cohesion: 0.10
Nodes (19): name, private, version, clsx, eslint, eslint-config-next, @netlify/plugin-nextjs, postcss (+11 more)

### Community 10 - "Dashboard Metrics Computation"
Cohesion: 0.18
Nodes (18): DashboardPage(), bucketResolutionTrend(), bucketVolumeTrend(), computeBacklogAging(), computeDurationStats(), countByEstadoInterno(), ESTADOS_INTERNOS_ORDEN, groupByCategoria() (+10 more)

### Community 11 - "shadcn Component Aliases Config"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 12 - "TypeScript Config"
Cohesion: 0.11
Nodes (17): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+9 more)

### Community 13 - "Dev Dependencies"
Cohesion: 0.20
Nodes (10): devDependencies, eslint, eslint-config-next, @netlify/plugin-nextjs, postcss, tailwindcss, @types/node, @types/react (+2 more)

### Community 14 - "Root Layout & Next Theming"
Cohesion: 0.22
Nodes (8): next, next-themes, inter, metadata, RootLayout(), MainNav(), Toaster(), ToasterProps

### Community 15 - "Casos Table Provider Editing"
Cohesion: 0.28
Nodes (7): updateCasoProveedor(), CasosTable(), handleEscaladoBlur(), handleEstadoProveedorChange(), persist(), cleanText(), formatFecha()

### Community 16 - "NPM Scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

### Community 17 - "ESLint Config"
Cohesion: 0.50
Nodes (3): extends, next/core-web-vitals, next/typescript

### Community 18 - "PPTX Export"
Cohesion: 0.50
Nodes (4): pptxgenjs, ExportPptxButton(), handleExport(), serie()

### Community 22 - "Deploy Process Notes"
Cohesion: 0.67
Nodes (3): Proceso de deploy (commit → deploy manual del usuario → verificación currentDeploy), Netlify branch deploys (no habilitados), Netlify CLI (netlify-cli@17)

## Knowledge Gaps
- **159 isolated node(s):** `OrderDir`, `SortableColumn`, `BadgeProps`, `ProveedorPageProps`, `CasosPageProps` (+154 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 185 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Reestructura de la fila de KPIs (2026-09-08)` connect `Design Taste Skill Content` to `Dashboard Page & Recharts`?**
  _High betweenness centrality (0.120) - this node is a cross-community bridge._
- **Why does `cn()` connect `Casos Table UI & Editing` to `Dashboard Page & Recharts`, `Shared UI Deps & Primitives`, `Login Flow & Magic Link`?**
  _High betweenness centrality (0.110) - this node is a cross-community bridge._
- **What connects `OrderDir`, `SortableColumn`, `BadgeProps` to the rest of the system?**
  _159 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Auth & Server Actions Core` be split into smaller, more focused modules?**
  _Cohesion score 0.0662004662004662 - nodes in this community are weakly interconnected._
- **Should `Casos Table UI & Editing` be split into smaller, more focused modules?**
  _Cohesion score 0.08282828282828283 - nodes in this community are weakly interconnected._
- **Should `Dashboard Page & Recharts` be split into smaller, more focused modules?**
  _Cohesion score 0.10033670033670034 - nodes in this community are weakly interconnected._
- **Should `GLPI/Proveedor Import & Session Notes` be split into smaller, more focused modules?**
  _Cohesion score 0.07686274509803921 - nodes in this community are weakly interconnected._