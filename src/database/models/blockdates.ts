import { DataTypes, Model } from "sequelize";
import sequelize from "../../config/database";

export class BlockedDates extends Model {
  public id!: string;
  public date!: string;
  public time!: string;
  public maxSlots!: number;
}

BlockedDates.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    time: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    maxSlots: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  },
  { sequelize, modelName: "blocked_dates" }
);

export default BlockedDates;
