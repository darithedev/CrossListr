FROM golang:1.22-alpine AS build
WORKDIR /src
RUN apk add --no-cache ca-certificates
COPY go.mod ./
COPY *.go ./
RUN go mod tidy && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /faketsy-api .

FROM alpine:3.19
RUN apk add --no-cache ca-certificates wget
RUN mkdir -p /tmp/faketsy-upload && chmod 1777 /tmp/faketsy-upload
COPY --from=build /faketsy-api /usr/local/bin/faketsy-api
USER nobody
EXPOSE 8081 8082
ENV FAKETSY_UPLOAD_DIR=/tmp/faketsy-upload
ENTRYPOINT ["/usr/local/bin/faketsy-api"]
