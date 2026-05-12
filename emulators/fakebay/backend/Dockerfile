FROM golang:1.23-alpine AS build
WORKDIR /src
RUN apk add --no-cache ca-certificates
COPY go.mod ./
COPY *.go ./
RUN go mod tidy && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /fakebay-api .

FROM alpine:3.19
RUN apk add --no-cache ca-certificates wget
COPY --from=build /fakebay-api /usr/local/bin/fakebay-api
USER nobody
EXPOSE 8081 8082
ENTRYPOINT ["/usr/local/bin/fakebay-api"]
