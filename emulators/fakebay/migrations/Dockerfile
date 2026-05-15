FROM migrate/migrate:v4.17.1

WORKDIR /migrations
COPY *.sql ./

ENTRYPOINT ["migrate", "-path", "/migrations"]
