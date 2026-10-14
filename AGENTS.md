<!-- BEGIN:nextjs-agent-rules -->
This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in node_modules/next/dist/docs/ (resolved from this file's directory; in monorepos the next package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by next dev — verify at node_modules/next/dist/server/lib/generate-agent-files.js. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
Mira Énergie — contexte du projet

Lis d'abord CLAUDE.md (à la racine) : il décrit le projet, l'état d'avancement, les règles d'équipe et les décisions. Ce fichier-ci n'en est qu'un renvoi, pour n'avoir qu'une seule source à tenir à jour.

Rappel des règles qui comptent le plus (détail dans CLAUDE.md §9, §10 et §14) :

Répondre en français. Une branche par tâche, partie de main à jour ; ni push ni fusion à la place de l'équipe.
Aucune donnée client réelle dans le dépôt (elle va dans data/prive/, ignoré par Git). .env n'est jamais versionné. Jamais npm audit fix --force.
Toute modification de prisma/schema.prisma passe par une PR séparée (label schema) avec une nouvelle migration ; ne jamais modifier une migration déjà fusionnée.
Ne pas toucher sans prévenir aux fichiers « chauds » : prisma/schema.prisma, package.json, src/modules/registry.ts.
Calculs = fonctions pures + tests *.test.ts à côté. Un seul fichier connaît le format de chaque fichier externe (DJU, Cabs, référentiel OPERAT).
Ne jamais inventer de valeur réglementaire : la marquer fictive, la rendre « non calculable », ou demander la source.
Avant de pousser : npm run check.