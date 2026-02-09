import { Model, DataTypes, Optional } from "sequelize";
import DB from "@config/database";
import Role from "@models/role";

interface UserAttributes {
  id: number;
  firstName: string;
  middleName?: string;
  lastName: string;
  birthdate?: Date;
  contactNumber?: string;
  email: string;
  password: string;
  resetToken?: string | null;
  resetTokenExpiry?: Date | null;
  ltmsNumber?: string;
  google_refresh_token?: string | null;
  roleId: number;
  isVerified: boolean;
  verificationToken?: string | null;
}

interface UserCreationAttributes extends Optional<UserAttributes, "id"> {}

class User extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes {
  public id!: number;
  public firstName!: string;
  public middleName?: string;
  public lastName!: string;
  public birthdate?: Date;
  public contactNumber?: string;
  public email!: string;
  public password!: string;
  public resetToken?: string | null;
  public resetTokenExpiry?: Date | null;
  public ltmsNumber?: string;
  public roleId!: number;
  public isVerified!: boolean;
  public verificationToken?: string | null;
  public google_refresh_token?: string | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
    role: any;
  public roleName!: string;
}

User.init(
  {
    id: {
      type: DataTypes.UUID, 
      defaultValue: DataTypes.UUIDV4, 
      primaryKey: true,
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    middleName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    birthdate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    contactNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    resetToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    resetTokenExpiry: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    ltmsNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    roleId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "roles",
        key: "id",
      },
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    verificationToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    google_refresh_token: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize: DB,
    modelName: "user",
    tableName: "users",
    timestamps: true,
  }
);

User.belongsTo(Role, { foreignKey: "roleId", as: "role" });

export default User;
