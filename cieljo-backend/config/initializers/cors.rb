# Be sure to restart your server when you modify this file.

# The browser only lets the frontend call this API if its address is allowed here (CORS).
# FRONTEND_ORIGIN gives that address, e.g. "https://cieljo.onrender.com" (several ones separated by commas).
# Outside production it defaults to the Vite dev server. In production it is required: without it the frontend
# could not call the API, so the app refuses to start with a clear message instead.
# Read more: https://github.com/cyu/rack-cors

frontend_origins = ENV.fetch("FRONTEND_ORIGIN") do
  raise "FRONTEND_ORIGIN must be set in production (the address of the frontend)" if Rails.env.production?

  "http://localhost:5173"
end

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins(*frontend_origins.split(",").map(&:strip))

    # The token travels in the Authorization header, never in a cookie: no credentials needed
    resource "*",
      headers: :any,
      methods: [ :get, :post, :put, :patch, :delete, :options, :head ],
      expose: [ "Authorization" ]
  end
end
