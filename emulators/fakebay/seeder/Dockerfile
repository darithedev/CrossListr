FROM golang:1.24-alpine AS build
WORKDIR /src
RUN apk add --no-cache ca-certificates
COPY go.mod ./
COPY main.go ./
RUN go mod tidy && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /fakebay-seed .

FROM alpine:3.19
RUN apk add --no-cache ca-certificates
COPY --from=build /fakebay-seed /usr/local/bin/fakebay-seed
USER nobody
ENTRYPOINT ["/usr/local/bin/fakebay-seed"]
