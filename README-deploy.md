# Deployment guide — learning-greek

This guide shows how to build and run the static site on a server with Docker installed. It includes an optional Caddy reverse proxy for automatic HTTPS.

Prerequisites:
- A server with Docker and Docker Compose (or just Docker) installed
- (Optional) A domain name pointing to the server's public IP

1) Build and run with Docker (single container)

- Copy the project to the server (git clone or rsync).
- From project root:

    docker build -t learning-greek-site:latest .
    docker run -d --name learning-greek -p 80:80 --restart unless-stopped learning-greek-site:latest

Visit http://SERVER_IP to verify.

2) Using docker-compose with optional Caddy for HTTPS

- A ready `Caddyfile` for `greek.sharybkin.ru` is included as `Caddyfile` in this repo. Edit the `tls` email address if you want notifications about certs.

- If you prefer to start from the example, copy and edit:

    # Linux / macOS
    cp Caddyfile.example Caddyfile

    # PowerShell
    Copy-Item Caddyfile.example Caddyfile

- Start services (either platform):

    docker-compose up -d --build

- Caddy will obtain certificates automatically via Let's Encrypt and serve your site with HTTPS for `greek.sharybkin.ru`.

3) DNS and firewall notes

- If using Caddy, ensure ports 80 and 443 are open in your firewall and the domain's A record(s) point to the server.

4) Verification and logs

- Check containers:

    docker ps

- View logs:

    docker-compose logs -f

5) Troubleshooting tips

- If Caddy fails to obtain certs, check that the domain points to the server and port 80/443 are reachable.
- If you don't want automatic TLS, skip adding Caddy and run the `site` service alone on port 80 or behind your own proxy.

6) Optional improvements

- Add a small healthcheck to the Dockerfile or docker-compose for monitoring.
- Use a CI action to build and push the image to a registry and `docker pull` on the server.
