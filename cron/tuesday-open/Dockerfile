FROM alpine:latest
RUN apk add --no-cache curl
WORKDIR /app
COPY tuesday-open.sh .
CMD ["sh", "tuesday-open.sh"]
