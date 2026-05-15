FROM golang:1.23-alpine AS build
WORKDIR /src
RUN apk add --no-cache ca-certificates
COPY go.mod go.sum ./
RUN go mod download
COPY *.go ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /fakify-api .

FROM alpine:3.19
RUN apk add --no-cache ca-certificates wget
RUN mkdir -p /tmp/fakify-upload && chmod 1777 /tmp/fakify-upload
COPY --from=build /fakify-api /usr/local/bin/fakify-api
USER nobody
EXPOSE 8080
ENV FAKIFY_UPLOAD_DIR=/tmp/fakify-upload
ENTRYPOINT ["/usr/local/bin/fakify-api"]
