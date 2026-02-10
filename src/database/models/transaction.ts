import { Model, DataTypes, Optional } from "sequelize";
import DB from "../../config/database";
import User from "@models/user";

interface TransactionAttributes {
  id: string;
  clientId: string;
  appointmentDate: Date;
  appointmentTime: string;
  typeOfTransaction: string;
  requirement: object;
  status: "pending" | "approved" | "rejected" | "cancelled";
  note?: string;
}

interface TransactionCreationAttributes
  extends Optional<TransactionAttributes, "id" | "status" | "note"> {}

class Transaction
  extends Model<TransactionAttributes, TransactionCreationAttributes>
  implements TransactionAttributes
{
  public id!: string;
  public clientId!: string;
  public appointmentDate!: Date;
  public appointmentTime!: string;
  public typeOfTransaction!: string;
  public requirement!: object;
  public status!: "pending" | "approved" | "rejected" | "cancelled";
  public note?: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public client?: User;
}

Transaction.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    clientId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    appointmentDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    appointmentTime: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    typeOfTransaction: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    requirement: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected", "cancelled"),
      defaultValue: "pending",
      allowNull: false,
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize: DB,
    modelName: "Transaction",
    tableName: "transactions",
    timestamps: true,
  }
);

Transaction.belongsTo(User, {
  foreignKey: "clientId",
  as: "client",
});
User.hasMany(Transaction, { foreignKey: "clientId", as: "transactions" });

export default Transaction;
