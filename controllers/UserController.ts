import { Request, Response, NextFunction } from "express";
import User from "../models/User";
import { storage, ref, uploadBytes, getDownloadURL } from "../config/firebase";
import { deleteObject } from "firebase/storage";
import helpers from "../untils/helpers";
import speakeasy from "speakeasy";
import * as bcrypt from "bcrypt";
import Message from "../models/Message";

class UserController {
  getInFormation: (req: Request, res: Response, next: NextFunction) => void;
  updateStandardInFormation: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void;
  updateLicense: (req: Request, res: Response, next: NextFunction) => void;
  updatePrivateInformation: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void;

  verifyOtpContact: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void;

  // SendToNewContact: (
  //   req: Request,
  //   res: Response,
  //   next: NextFunction
  // ) => void;

  UpdateContact: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void;

  updatePassword : (req: Request, res: Response, next: NextFunction) => void;

  enableTwoFactor: (req: Request, res: Response, next: NextFunction) => void;

  verifyTwoFactor: (req: Request, res: Response, next: NextFunction) => void;

  getMessages: (req: Request, res: Response, next: NextFunction) => void;

  saltRounds: number = 10;

  constructor() {
    this.getInFormation = async (req: Request, res: Response) => {
      try {
        const { userId } = req.params;
        const user = await User.findOne({
          userId: helpers.convertStringToObjectId(userId),
        }).populate('creditCards')
        .populate({
          path: 'promotions',
          match: { isActive: true },
        });

        if (user) {
          res.status(200).send(user);
        } else {
          res.status(401).send({msg: "User not found"});
        }
      } catch (error: any) {
        res.status(500).send({msg: error.message});
      }
    };

    this.updateStandardInFormation = async (req: Request, res: Response) => {
      try {
        const data = req.body;
        console.log(data);
        const user = await User.findOne({
          userId: helpers.convertStringToObjectId(data.userId),
        });
        let name = "";
        let birthdate: Date | null | undefined = new Date();
        let address = [];
        let avatar: string | null | undefined = "";

        if (user) {
          name = data.name ? data.name : user.name;
          birthdate = data.birthdate
            ? new Date(data.birthdate)
            : user.birthdate;
          address = data.address ? data.address : user.address;

          if (req.file) {
            avatar = await UserController.uploadAvatar(
              req.file,
              res,
              data.userId,
              user.avatar
            );
            user.avatar = avatar;
          }
          user.name = name;
          user.birthdate = birthdate;
          user.address = address;
          await user.save();
          req.session.user = user;
          return res.status(200).send({
            msg: "Update standard infor success",
            user: user,
          });
        }
      } catch (error: any) {
        res.status(500).send({msg: error.message});
      }
    };

    this.updateLicense = async (req: Request, res: Response) => {
      try {
        const data = req.body;
        const user = await User.findOne({
          userId: helpers.convertStringToObjectId(data.userId),
        });

        const files = req.files as {
          [fieldname: string]: Express.Multer.File[];
        };

        if (user) {
          if (user.status === "pending") {
            if (
              user.frontLicense &&
              user.backLicense &&
              user.frontLincenseCar &&
              user.backLincenseCar
            ) {
              return res.status(400).send({msg: "License is pending"});
            }
            const filesUrl = await UserController.uploadLicenes(
              files,
              res,
              data.userId
            );
            if (filesUrl && Object.keys(filesUrl).length > 0) {
              user.frontLicense = filesUrl.frontLicense
                ? filesUrl.frontLicense
                : user.frontLicense;
              user.backLicense = filesUrl.backLicense
                ? filesUrl.backLicense
                : user.backLicense;
              user.frontLincenseCar = filesUrl.frontLincenseCar
                ? filesUrl.frontLincenseCar
                : user.frontLincenseCar;
              user.backLincenseCar = filesUrl.backLincenseCar
                ? filesUrl.backLincenseCar
                : user.backLincenseCar;
            }
            if (
              user.frontLicense &&
              user.backLicense &&
              user.frontLincenseCar &&
              user.backLincenseCar
            ) {
              user.status = "active";
            }
            await user.save();
            req.session.user = user;
            return res.status(200).send({
              msg: "Update license success",
              user: user,
            });
          } else {
            const licenses: any = {};
            for (const fieldName in files) {
              if (files[fieldName] && files[fieldName].length > 0) {
                switch (fieldName) {
                  case "frontLicense":
                    licenses.frontLicense = user.frontLicense;
                    break;
                  case "backLicense":
                    licenses.backLicense = user.backLicense;
                    break;
                  case "frontLincenseCar":
                    licenses.frontLincenseCar = user.frontLincenseCar;
                    break;
                  case "backLincenseCar":
                    licenses.backLincenseCar = user.backLincenseCar;
                    break;
                  default:
                    break;
                }
              }
            }
            const filesUrl = await UserController.uploadLicenes(
              files,
              res,
              data.userId,
              licenses
            );
            if (filesUrl && Object.keys(filesUrl).length > 0) {
              user.frontLicense = filesUrl.frontLicense
                ? filesUrl.frontLicense
                : user.frontLicense;
              user.backLicense = filesUrl.backLicense
                ? filesUrl.backLicense
                : user.backLicense;
              user.frontLincenseCar = filesUrl.frontLincenseCar
                ? filesUrl.frontLincenseCar
                : user.frontLincenseCar;
              user.backLincenseCar = filesUrl.backLincenseCar
                ? filesUrl.backLincenseCar
                : user.backLincenseCar;
              user.status = "pending";
            }
            await user.save();
            req.session.user = user;
            return res.status(200).send({
              msg: "Update license success",
              user: user,
            });
          }
        } else {
          res.status(401).send({msg: "User not found"});
        }
      } catch (error: any) {
        res.status(500).send({msg: error.message});
      }
    };

    this.updatePrivateInformation = async (req: Request, res: Response) => {
      try {
        const { email, phonenumber, userId } = req.body;

        if (!email && !phonenumber) {
          return res
            .status(400)
            .send({msg: "Please provide new email or new phonenumber to verify"});
        }

        const user = await User.findOne({
          userId: helpers.convertStringToObjectId(userId),
        });

        if (!user) {
          return res.status(400).send({msg: "User not found"});
        }

        if (user.email && email && user.email === email) {
          const otp = helpers.generateOTP();
          const token = helpers.signToken(otp, user.email);
          const mailText = `Your OTP code is: ${otp}. This code is valid for 5 minutes.`;
          await helpers.sendMail(user.email, "Your OTP Code", mailText);
          return res.status(200).json({
            message: "OTP sent to old email",
            token,
            otp,
            status: "OLD",
          });
        } else if (!user.email && email || user.email !== email) {
          const otp = helpers.generateOTP();
          const token = helpers.signToken(otp, email);
          const mailText = `Your OTP code is: ${otp}. This code is valid for 5 minutes.`;
          await helpers.sendMail(email, "Your OTP Code", mailText);
          return res.status(200).json({
            message: "OTP sent to new email",
            token,
            otp,
            status: "NEW",
          });
        }

        if (user.phonenumber && phonenumber) {
          const otp = helpers.generateOTP();
          const token = helpers.signToken(otp, user.phonenumber);
          await helpers.sendOtp(user.phonenumber, otp);
          return res.status(200).json({
            message: "OTP sent to old phonenumber",
            token,
            otp,
            status: "OLD",
          });
        } else if (!user.phonenumber && phonenumber) {
          const otp = helpers.generateOTP();
          const token = helpers.signToken(otp, phonenumber);
          await helpers.sendOtp(phonenumber, otp);
          return res.status(200).json({
            message: "OTP sent to new phonenumber",
            token,
            otp,
            status: "NEW",
          });
        }

        return res
          .status(400)
          .send({msg: "Please provide new email or new phonenumber to verify"});
      } catch (err: any) {
        res.status(500).send({msg: `Server error: ${err.message}`});
      }
    };

    this.updatePassword = async (req: Request, res: Response) => {
      try {
        const { userId, oldPassword, newPassword, confirmPassword } = req.body;
        
        if (!userId || !oldPassword || !newPassword || !confirmPassword) {
          return res.status(400).json({ msg: 'Please provide all fields' });
        }

        const user = await User.findOne({userId: helpers.convertStringToObjectId(userId)});
        if (!user) {
          return res.status(404).json({ msg: 'User not found' });
        }
    
        const isMatch = await bcrypt.compare(oldPassword, user.password);;
        if (!isMatch) {
          return res.status(400).json({ msg: 'Incorrect old password' });
        }
    
        if (newPassword !== confirmPassword) {
          return res.status(400).json({ msg: 'New password and confirmation do not match' });
        }
    
        const hashedPassword = await bcrypt.hash(newPassword, this.saltRounds);;
        user.password = hashedPassword;
        await user.save();
    
        return res.status(200).json({ message: 'Password updated successfully' });
      } catch (error) {
        return res.status(500).json({ msg: 'Server error', error });
      }
    }

    this.verifyOtpContact = async (req: Request, res: Response) => {
      try {
        const { userId, otp, token, input } =
          req.body;

        const user = await User.findOne({
          userId: helpers.convertStringToObjectId(userId),
        });

        if (!user) {
          return res.status(400).send({msg: "User not found"});
        }

        const isVerified = helpers.verifyOTP(input, otp, token);

        if (!isVerified.status) {
          return res.status(400).send({msg: isVerified.msg});
        }

        // Gửi OTP đến thông tin liên lạc mới

        return res
          .status(200)
          .send(isVerified.msg);
      } catch (err: any) {
        res.status(500).send({msg: err.message});
      }
    }

    // this.SendToNewContact = async (req: Request, res: Response) => {
    //   try {
    //     const {userId, newEmail, newPhonenumber } =
    //       req.body;

    //     const user = await User.findOne({
    //       userId: helpers.convertStringToObjectId(userId),
    //     });

    //     if (!user) {
    //       return res.status(400).send("User not found");
    //     }

    //     const newInput = newEmail ? newEmail : newPhonenumber;
    //     // Gửi OTP đến thông tin liên lạc mới
    //     const newOtp = helpers.generateOTP();
    //     const newToken = helpers.signToken(newOtp, newInput);

    //     if (newEmail) {
    //       const mailText = `Your OTP code is: ${newOtp}. This code is valid for 5 minutes.`;
    //       await helpers.sendMail(newEmail, "Your OTP Code", mailText);
    //       return res
    //         .status(200)
    //         .json({ message: "OTP sent to new email", newOtp, newToken });
    //     }

    //     if (newPhonenumber) {
    //       await helpers.sendOtp(newPhonenumber, newOtp);
    //       return res
    //         .status(200)
    //         .json({ message: "OTP sent to new phonenumber", newOtp, newToken });
    //     }

    //     return res
    //       .status(400)
    //       .send("Please provide new email or new phonenumber to verify");
    //   } catch (err: any) {
    //     res.status(500).send(err.message);
    //   }
    // };

    this.UpdateContact = async (req: Request, res: Response) => {
      try {
        const { userId, newEmail, newPhonenumber } = req.body;

        const user = await User.findOne({
          userId: helpers.convertStringToObjectId(userId),
        });

        if (!user) {
          return res.status(400).send({msg: "User not found"});
        }

        if (newEmail) {
          user.email = newEmail;
        }

        if (newPhonenumber) {
          user.phonenumber = newPhonenumber;
        }

        await user.save();

        return res
          .status(200)
          .json({ message: "Contact information updated successfully", user });
      } catch (err: any) {
        res.status(500).send({msg: err.message});
      }
    };

    this.enableTwoFactor = async (req: Request, res: Response) => {
      const { userId } = req.body;
      const secret = speakeasy.generateSecret();

      // Save the secret to the user's profile
      await User.findByIdAndUpdate(
        { userId: helpers.convertStringToObjectId(userId) },
        { twoFactorSecret: secret.base32 }
      );

      res.status(200).json({ secret: secret.otpauth_url });
    };

    this.verifyTwoFactor = async (req: Request, res: Response) => {
      const { userId, token } = req.body;
      const user = await User.findOne({
        userId: helpers.convertStringToObjectId(userId),
      });

      const verified = speakeasy.totp.verify({
        secret: user && user.twoFactorSecret ? user.twoFactorSecret : "",
        encoding: "base32",
        token,
      });

      if (verified) {
        res.status(200).json({ message: "2FA verified successfully" });
      } else {
        res.status(401).json({ msg: "Invalid token" });
      }
    };

    this.getMessages = async (
      req: Request,
      res: Response,
      next: NextFunction
    ) => {
      try {
        const { roomId, userId } = req.params;
        const messages = await Message.find({
          roomId,
          userId: helpers.convertStringToObjectId(userId),
        });
        res.status(200).json(messages);
      } catch (error) {
        res.status(500).json({ msg: "Error retrieving messages", error });
      }
    };
  }

  static async uploadAvatar(
    files: Express.Multer.File,
    res: Response,
    userId: string = "",
    existingAvatarUrl: string | null | undefined = ""
  ) {
    try {
      const fileName = `${new Date().getTime()}-${files.originalname}`;
      const filePath = userId ? `${userId}/${fileName}` : `${fileName}`;
      const avatarRef = ref(storage, filePath);

      if (existingAvatarUrl) {
        const tempFilePath = helpers.getFileNameFireBase(existingAvatarUrl);
        const newFilePath = `${userId}/${tempFilePath}`;
        const oldAvatarRef = ref(storage, newFilePath);
        await deleteObject(oldAvatarRef);
      }

      await uploadBytes(avatarRef, files.buffer, {
        contentType: files.mimetype,
        contentDisposition: "inline",
      });
      const avatarUrl = await getDownloadURL(avatarRef);
      return avatarUrl;
    } catch (error) {
      res.status(500).json({ msg: "Error uploading files", error });
    }
    return "";
  }

  static async uploadLicenes(
    files: { [fieldname: string]: Express.Multer.File[] },
    res: Response,
    userId: string = "",
    licenses: { [fieldname: string]: string | null | undefined } = {}
  ) {
    try {
      let uploadedFiles: { [fieldname: string]: string } = {};
      if (Object.keys(licenses).length > 0) {
        for (const fieldname in licenses) {
          const tempFilePath = licenses[fieldname]
            ? helpers.getFileNameFireBase(licenses[fieldname])
            : "";
          const newFilePath = `${userId}/${tempFilePath}`;
          const oldLicenseRef = ref(storage, newFilePath);
          await deleteObject(oldLicenseRef);
        }
      }
      for (const fieldname in files) {
        const file = files[fieldname][0];
        const fileName = `${new Date().getTime()}-${file.originalname}`;
        const filePath = userId ? `${userId}/${fileName}` : `${fileName}`;
        const fileRef = ref(storage, filePath);

        await uploadBytes(fileRef, file.buffer, {
          contentType: file.mimetype,
          contentDisposition: "inline",
        });
        const fileUrl = await getDownloadURL(fileRef);
        uploadedFiles[fieldname] = fileUrl;
      }
      return uploadedFiles;
    } catch (error) {
      res.status(500).json({ msg: "Error uploading files", error });
    }
  }
}

export default new UserController();
