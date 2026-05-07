# BLUE-TANUKI systemd Deployment

This directory contains a single-host systemd packaging template for running
BLUE-TANUKI gateway serve mode outside Docker.

## Files

- `blue-tanuki.service`: systemd unit template.
- `blue-tanuki.env.example`: environment-file template for
  `/etc/blue-tanuki/blue-tanuki.env`.

## Install Outline

```bash
sudo useradd --system --home-dir /opt/blue-tanuki --shell /usr/sbin/nologin blue-tanuki
sudo mkdir -p /opt/blue-tanuki /etc/blue-tanuki /var/lib/blue-tanuki/audit /var/lib/blue-tanuki/sessions
sudo chown -R blue-tanuki:blue-tanuki /opt/blue-tanuki /var/lib/blue-tanuki

# Copy the built repository artifact into /opt/blue-tanuki, then:
sudo cp deploy/systemd/blue-tanuki.service /etc/systemd/system/blue-tanuki.service
sudo cp deploy/systemd/blue-tanuki.env.example /etc/blue-tanuki/blue-tanuki.env
sudo chmod 600 /etc/blue-tanuki/blue-tanuki.env
sudoedit /etc/blue-tanuki/blue-tanuki.env

sudo systemctl daemon-reload
sudo systemctl enable --now blue-tanuki.service
sudo systemctl status blue-tanuki.service
```

## Notes

- Set distinct long random values for `WEBCHAT_TOKEN` and
  `WEBCHAT_RESUME_TOKEN`.
- The unit runs `node apps/gateway/dist/main.js --serve`.
- Node.js must be available as `node` in `/usr/local/bin`, `/usr/bin`, or
  `/bin`.
- `ExecStartPre` runs `--doctor` and blocks start only for error exit code 2.
  Warning exit code 1 is allowed so optional Slack/Discord/LLM credentials can
  remain unset.
- Default persistent paths are `/var/lib/blue-tanuki/audit` and
  `/var/lib/blue-tanuki/sessions`.
- The service uses a non-root `blue-tanuki` user and basic systemd hardening.
