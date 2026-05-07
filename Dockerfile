# syntax=docker/dockerfile:1

ARG NODE_IMAGE=node:22-bookworm-slim

FROM ${NODE_IMAGE} AS build
WORKDIR /app

ENV CI=true
ENV PNPM_HOME=/pnpm
ENV PATH="${PNPM_HOME}:${PATH}"

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm build

FROM ${NODE_IMAGE} AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV WEBCHAT_HOST=0.0.0.0
ENV WEBCHAT_PORT=8787

RUN groupadd --system blue-tanuki \
  && useradd --system --gid blue-tanuki --home-dir /app blue-tanuki \
  && mkdir -p /data/audit /data/sessions \
  && chown -R blue-tanuki:blue-tanuki /app /data

COPY --from=build --chown=blue-tanuki:blue-tanuki /app/package.json ./package.json
COPY --from=build --chown=blue-tanuki:blue-tanuki /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=build --chown=blue-tanuki:blue-tanuki /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build --chown=blue-tanuki:blue-tanuki /app/node_modules ./node_modules
COPY --from=build --chown=blue-tanuki:blue-tanuki /app/packages ./packages
COPY --from=build --chown=blue-tanuki:blue-tanuki /app/apps ./apps
COPY --from=build --chown=blue-tanuki:blue-tanuki /app/docs ./docs

EXPOSE 8787
VOLUME ["/data"]

USER blue-tanuki

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "const port=process.env.WEBCHAT_PORT||'8787'; fetch('http://127.0.0.1:'+port+'/healthz').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1));"

CMD ["node", "apps/gateway/dist/main.js", "--serve"]
