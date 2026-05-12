FROM golang:1.22-alpine AS build
WORKDIR /src
RUN apk add --no-cache ca-certificates
COPY go.mod main.go ./
RUN CGO_ENABLED=0 go build -o /fakebay-api .

FROM alpine:3.19
RUN apk add --no-cache ca-certificates
COPY --from=build /fakebay-api /usr/local/bin/fakebay-api
USER nobody
EXPOSE 8081 8082
ENTRYPOINT ["/usr/local/bin/fakebay-api"]
