import axios from "axios";

export const getNewTokens = async (refreshToken: string) => {
  const { data } = await axios.post(
    "https://dev-y46rx7m3v1vrx3nt.us.auth0.com/oauth/token",
    {
      client_id: process.env.AUTH0_ID,
      client_secret: process.env.AUTH0_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }
  );

  return data;
};
