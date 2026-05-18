# BLUE-TANUKI Resident Integration Helpers

These helpers back the portable installer launcher commands for resident local
operation. They do not create a signed native app, do not add a second authority
path, and do not enable autostart unless the owner explicitly runs the
autostart command. This means the helper does not enable autostart during setup
or install.

Launcher command surface:

- `resident-start`
- `resident-status`
- `resident-stop`
- `resident-open`
- `resident-logs`
- `resident-autostart-enable`
- `resident-autostart-disable`
- `resident-autostart-status`

Resident mode starts the existing Gateway serve process with the generated env
file. All WebChat, Approval Gate, HDS-BRAIN, audit, Runtime Invariants, and
Control Center rules remain unchanged.
