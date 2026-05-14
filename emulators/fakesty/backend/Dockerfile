FROM golang:1.22-alpine AS build
WORKDIR /src
RUN apk add --no-cache ca-certificates
COPY go.mod ./
COPY *.go ./
RUN go mod tidy && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /fakesty-api .

FROM alpine:3.19
RUN apk add --no-cache ca-certificates wget
RUN mkdir -p /tmp/fakesty-upload && chmod 1777 /tmp/fakesty-upload
COPY --from=build /fakesty-api /usr/local/bin/fakesty-api
USER nobody
EXPOSE 8080
ENV FAKESTY_UPLOAD_DIR=/tmp/fakesty-upload
ENTRYPOINT ["/usr/local/bin/fakesty-api"]
