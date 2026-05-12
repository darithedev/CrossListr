FROM golang:1.22-alpine AS build
WORKDIR /src
RUN apk add --no-cache ca-certificates
COPY go.mod main.go ./
RUN CGO_ENABLED=0 go build -o /fakesty-api .

FROM alpine:3.19
RUN apk add --no-cache ca-certificates
COPY --from=build /fakesty-api /usr/local/bin/fakesty-api
USER nobody
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/fakesty-api"]
