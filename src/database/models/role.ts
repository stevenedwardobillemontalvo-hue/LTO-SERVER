import { Model, DataTypes, Optional } from "sequelize";
import DB from "../../config/database";

interface RoleAttributes {
  id: string;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface RoleCreationAttributes extends Optional<RoleAttributes, "id"> {}

class Role extends Model<RoleAttributes, RoleCreationAttributes>
  implements RoleAttributes {
  public id!: string;
  public name!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Role.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
  },
  {
    sequelize: DB,
    modelName: "Role",
    tableName: "roles", 
    timestamps: true,
  }
);

export default Role;
