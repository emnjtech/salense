import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { AcceptInvitationRequestDto } from "../dto/accept-invitation-request.dto.js";
import { InvitationTokenQueryDto } from "../dto/invitation-token-query.dto.js";

describe("AcceptInvitationRequestDto", () => {
  it("accepts the fields required to create an invited account", async () => {
    const errors = await validate(
      plainToInstance(AcceptInvitationRequestDto, {
        confirmPassword: "Password123!",
        firstName: "Mia",
        lastName: "Lewis",
        password: "Password123!",
        token: "raw-token",
      }),
    );

    expect(errors).toEqual([]);
  });

  it("rejects missing account creation fields", async () => {
    const errors = await validate(plainToInstance(AcceptInvitationRequestDto, {}));

    expect(errors.map((error) => error.property).sort()).toEqual([
      "confirmPassword",
      "firstName",
      "lastName",
      "password",
      "token",
    ]);
  });
});

describe("InvitationTokenQueryDto", () => {
  it("requires a token query parameter", async () => {
    const errors = await validate(plainToInstance(InvitationTokenQueryDto, {}));

    expect(errors.map((error) => error.property)).toEqual(["token"]);
  });
});
