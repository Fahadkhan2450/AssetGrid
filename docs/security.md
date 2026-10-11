# Security

- Backend enforces authorization.
- Employee cannot approve/reject/issue/return through API.
- Passwords are bcrypt-hashed.
- MongoDB is not exposed to users.
- Production should use HTTPS and company SSO where available.
- Audit logs record important actions.
