const ROOT_ADMIN_EMAIL = (process.env.ROOT_ADMIN_EMAIL || `admin@test.local`).toLowerCase();
const ROOT_ADMIN_USERNAME = process.env.ROOT_ADMIN_USERNAME || `admin`;
const ROOT_ADMIN_PASSWORD = process.env.ROOT_ADMIN_PASSWORD || `Admin12345!`;
const ROOT_ADMIN_CODE = process.env.ROOT_ADMIN_CODE || `Root-7781`;

module.exports = {
    ROOT_ADMIN_EMAIL,
    ROOT_ADMIN_USERNAME,
    ROOT_ADMIN_PASSWORD,
    ROOT_ADMIN_CODE
};
