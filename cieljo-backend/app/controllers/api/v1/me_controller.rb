# The account of the logged-in user: read it (the frontend also calls it to check that the session is still
# valid), edit it, delete it.
class Api::V1::MeController < ApplicationController
  # Slows down guessing the current password with a stolen session: 10 edits or deletions per 3 minutes per user
  rate_limit to: 10, within: 3.minutes, only: %i[update destroy], by: -> { current_user.id }, with: -> { render_rate_limited }

  rescue_from ActionController::ParameterMissing do
    render json: { error: "The account data is missing." }, status: :bad_request
  end

  # GET /api/v1/me
  def show
    render json: { data: user_json }, status: :ok
  end

  # PATCH /api/v1/me with { user: { username, email, password, current_password } }
  # Every field is optional; a blank password keeps the current one. Changing the email or the password needs
  # the current password. A new password revokes every token of the user (a new jti, like a logout on all their
  # devices), so a stolen session ends; the answer carries a new token for this device.
  #
  # A wrong current password answers 422, not 401: the frontend treats a 401 as an expired session.
  def update
    attributes = params.expect(user: %i[username email password current_password])
    changes = attributes.slice(:username, :email, :password).to_h.symbolize_keys
    changes.delete(:password) if changes[:password].blank?
    email_changed = changes.key?(:email) && changes[:email].to_s.strip.downcase != current_user.email
    password_changed = changes.key?(:password)

    if (email_changed || password_changed) && !current_user.valid_password?(attributes[:current_password].to_s)
      return render_wrong_password
    end

    current_user.assign_attributes(changes)
    current_user.jti = SecureRandom.uuid if password_changed

    if current_user.save
      data = user_json
      data[:token] = "Bearer #{Warden::JWTAuth::UserEncoder.new.call(current_user, :user, nil).first}" if password_changed
      render json: { status: { code: 200, message: "Account updated." }, data: data }, status: :ok
    else
      render json: {
        error: current_user.errors.full_messages.to_sentence,
        errors: current_user.errors.full_messages
      }, status: :unprocessable_entity
    end
  end

  # DELETE /api/v1/me with { user: { current_password } }
  # Leaves every game of the user, then deletes the account (DeleteAccountService).
  def destroy
    password = params.expect(user: %i[current_password])[:current_password]
    return render_wrong_password unless current_user.valid_password?(password.to_s)

    DeleteAccountService.new(current_user).call

    render json: { status: { code: 200, message: "Account deleted." } }, status: :ok
  end

  private

  def user_json
    { id: current_user.id, email: current_user.email, username: current_user.username }
  end

  def render_wrong_password
    render json: { error: "Your current password is incorrect." }, status: :unprocessable_entity
  end
end
