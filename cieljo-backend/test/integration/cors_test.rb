require "test_helper"

# The frontend address allowed by config/initializers/cors.rb (http://localhost:5173 outside production)
class CorsTest < ActionDispatch::IntegrationTest
  def preflight(origin)
    process :options, api_v1_auth_login_url, headers: {
      "Origin" => origin,
      "Access-Control-Request-Method" => "POST",
      "Access-Control-Request-Headers" => "Content-Type, Authorization"
    }
  end

  test "the frontend may call the API" do
    preflight("http://localhost:5173")

    assert_equal "http://localhost:5173", response.headers["Access-Control-Allow-Origin"]
    assert_includes response.headers["Access-Control-Allow-Methods"], "POST"
  end

  test "another site may not call the API" do
    preflight("https://evil.example.com")

    assert_nil response.headers["Access-Control-Allow-Origin"]
  end

  test "cookies are not allowed across sites" do
    preflight("http://localhost:5173")

    assert_nil response.headers["Access-Control-Allow-Credentials"]
  end

  test "the frontend can read the Authorization header of the answers" do
    post api_v1_auth_login_url, params: { user: { email: "one@example.com", password: "password123" } },
                                headers: { "Origin" => "http://localhost:5173" }, as: :json

    assert_equal "http://localhost:5173", response.headers["Access-Control-Allow-Origin"]
    assert_includes response.headers["Access-Control-Expose-Headers"], "Authorization"
  end
end
