# edge02: TLS + Login für das CMS

edge02 terminiert TLS für `cms.kozlowski-it.de` und `cms-vorschau.kozlowski-it.de`, lässt per
oauth2-proxy (`auth_request`) nur Zitadel-Konten mit der Rolle `cms-editor` durch und reicht dann über
WireGuard in die DMZ-85 weiter (payload `10.30.85.2:3000`, preview `10.30.85.3:80`).
Diese Dateien sind die **Quelle** der Live-Konfiguration; `npm run check:deploy` prüft sie statisch.
Änderungen erst hier, dann auf edge02 einspielen (nie umgekehrt nur auf dem Server).

| Datei im Repo | Ort auf edge02 | Rechte |
|---|---|---|
| `cms.kozlowski-it.de.conf` | `/etc/nginx/sites-available/` + Symlink in `/etc/nginx/sites-enabled/` | 644 root:root |
| `cms-vorschau.kozlowski-it.de.conf` | `/etc/nginx/sites-available/` + Symlink in `/etc/nginx/sites-enabled/` | 644 root:root |
| `oauth2-proxy-cms.cfg.example` | `/etc/oauth2-proxy/cms.cfg` (Platzhalter `<SECRET>` ersetzen) | 640 root:oauth2proxy |
| `oauth2-proxy-cms.service` | `/etc/systemd/system/oauth2-proxy-cms.service` | 644 root:root |
| — (nie im Repo) | `/etc/nginx/snippets/cms-edge-secret.conf`, erzeugt aus `/root/cms-edge-secret` | 600 root:root |

Secrets stehen **nie** in diesen Dateien: die vHosts binden das Edge-Secret nur per
`include /etc/nginx/snippets/cms-edge-secret.conf;` ein, die oauth2-proxy-Config hat Platzhalter.

oauth2-proxy: **v7.15.5**, offizielles Release-Binary, sha256 gegen die Release-Checksumme geprüft,
nach `/usr/local/bin/oauth2-proxy`; läuft als Systemnutzer `oauth2proxy` auf `127.0.0.1:4180`.

## Einspielen

```sh
# vHosts
install -m 644 cms.kozlowski-it.de.conf cms-vorschau.kozlowski-it.de.conf /etc/nginx/sites-available/
ln -sf /etc/nginx/sites-available/cms.kozlowski-it.de.conf /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/cms-vorschau.kozlowski-it.de.conf /etc/nginx/sites-enabled/

# Edge-Secret-Snippet (gleicher Wert wie EDGE_SHARED_SECRET in /opt/docker/apps/cms/.env auf docker01)
( umask 077; printf 'proxy_set_header X-Edge-Secret "%s";\n' "$(cat /root/cms-edge-secret)" \
    > /etc/nginx/snippets/cms-edge-secret.conf )

nginx -t && systemctl reload nginx

# oauth2-proxy
install -m 640 -o root -g oauth2proxy oauth2-proxy-cms.cfg.example /etc/oauth2-proxy/cms.cfg   # dann <SECRET> ersetzen
install -m 644 oauth2-proxy-cms.service /etc/systemd/system/
systemctl daemon-reload && systemctl enable oauth2-proxy-cms && systemctl restart oauth2-proxy-cms
```

`cookie_secret` neu: `openssl rand -base64 32 | tr -- '+/' '-_'`. `client_id`/`client_secret` aus der
Zitadel-App „cms“. Kein `cookie_domain` setzen — das Cookie gilt so nur für den jeweiligen Host.
