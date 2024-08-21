import { Request, Response, NextFunction } from "express";
import User from "../models/User";
import Token from "../models/Token";
import * as bcrypt from "bcrypt";
import helpers from "../untils/helpers";
import { OAuth2Client } from "google-auth-library";
import { storage, ref, uploadBytes, getDownloadURL } from "../config/firebase";
import { deleteObject } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";

class AuthenticationController {
  validateRegister: (req: Request, res: Response, next: NextFunction) => void;
  Register: (req: Request, res: Response, next: NextFunction) => void;
  validateLogin: (req: Request, res: Response, next: NextFunction) => void;
  Login: (req: Request, res: Response, next: NextFunction) => void;
  LoginGoogle: (req: Request, res: Response, next: NextFunction) => void;
  verifyLoginGoogle: (req: Request, res: Response, next: NextFunction) => void;
  LoginFacebook: (req: Request, res: Response, next: NextFunction) => void;
  verifyLoginFacebook: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void;
  Logout: (req: Request, res: Response, next: NextFunction) => void;
  verifyOTP: (req: Request, res: Response, next: NextFunction) => void;
  forgotPassword: (req: Request, res: Response, next: NextFunction) => void;
  verifyOTPForgot: (req: Request, res: Response, next: NextFunction) => void;
  confirmPassword: (req: Request, res: Response, next: NextFunction) => void;
  saltRounds: number = 10;

  constructor() {
    // #region Login and Register
    this.validateRegister = async (
      req: Request,
      res: Response,
      next: NextFunction
    ) => {
      const { phonenumber, email, isOwner } = req.body;
      const data = req.body;
      console.log("Data: ", data);
      if (!helpers.isValidEmail(email) && email) {
        return res.status(400).send({ msg: "Please enter the valid email address" });
      }
      const conditions = [];
      if (email) {
        conditions.push({ email: email });
      }
      if (phonenumber) {
        conditions.push({ phonenumber: phonenumber });
      }

      try {
        const user = await User.findOne({
          $or: conditions,
        });
        if (user) {
          if (user.email === email && conditions[0].email) {
            return res.status(400).send({ msg: "Email is already in exist" });
          }
          if (user.phonenumber === phonenumber && conditions[0].phonenumber) {
            return res.status(400).send({ msg: "Phonenumber is already in exist" });
          }
        }
        if (!data.name || !data.birthdate) {
          return res.status(400).send({ msg: "Missing information" });
        }
        if (isOwner && data) {
          if (!data.name || !data.address || !data.birthdate) {
            return res.status(400).send({ msg: "Missing information" });
          }
          if (helpers.calculateAge(new Date(data.birthdate)) < 18) {
            return res
              .status(400)
              .send({ msg: "You must be at least 18 years old to register" });
          }
        }
        next();
      } catch (error: any) {
        return res
          .status(500)
          .send({ msg: "Register failed: " + error.message || error });
      }
    };

    this.Register = async (req: Request, res: Response, next: NextFunction) => {
      const { phonenumber, email, password, isOwner } = req.body;
      const data = req.body;
      console.log("Data: ", data);
      let fileHasSaves: { [fieldname: string]: string } = {};
      try {
        if (isOwner) {
          const files = req.files as {
            [fieldname: string]: Express.Multer.File[];
          };
          let handleFiles = await AuthenticationController.handleFile(
            files,
            res
          );
          if (handleFiles && Object.keys(handleFiles).length > 0) {
            fileHasSaves = handleFiles;
          }
        }
        const otp = helpers.generateOTP();
        const hash = await bcrypt.hash(password, this.saltRounds);
        if (!hash) {
          return res.status(500).send({ msg: "Password encryption failed" });
        }
        if (email) {
          const token = helpers.signToken(otp, email);
          const mailText = `Your OTP code is: ${otp}. This code is valid for 5 minutes.`;

          helpers.sendMail(email, "Your OTP Code", mailText).then(() => {
            return res.status(200).json({
              message: "OTP sent",
              otp: otp,
              token: token,
              email: email,
              password: hash,
              files: fileHasSaves,
              name: data.name,
              address: data.address,
              birthdate: data.birthdate,
            });
          });
        } else {
          const token = helpers.signToken(otp, phonenumber);
          helpers.sendOtp(phonenumber, otp).then(() => {
            return res.status(200).json({
              message: "OTP sent",
              otp: otp,
              token: token,
              phonenumber: phonenumber,
              password: hash,
              files: fileHasSaves,
              name: data.name,
              address: data.address,
              birthdate: data.birthdate,
            });
          });
        }
      } catch (error: any) {
        return res
          .status(500)
          .send({ msg: "Register failed: " + error.message || error });
      }
    };

    this.verifyOTP = async (
      req: Request,
      res: Response,
      next: NextFunction
    ) => {
      const { input, otp, token, password, data } = req.body;
      try {
        const isVerified = helpers.verifyOTP(input, otp, token);
        let handleFile: { [fieldname: string]: string } | undefined = {};
        let address = "";
        let name = "";
        let birthdate = "";
        let isOwner = false;
        if (isVerified.status) {
          name = data.name;
          birthdate = data.birthdate;
          const newUser = new User({
            name: name,
            email: helpers.isValidEmail(input) ? input : "",
            password: password,
            phonenumber: !helpers.isValidEmail(input) ? input : "",
            address: [],
            birthdate: birthdate ? new Date(birthdate) : new Date(),
            frontLicense: handleFile?.frontLicense || "",
            backLicense: handleFile?.backLicense || "",
            frontLincenseCar: handleFile?.frontLincenseCar || "",
            backLincenseCar: handleFile?.backLincenseCar || "",
            countFailed: 0,
            isOwner: isOwner,
            avatar: "",
          });
          if (data && data.files && Object.keys(data.files).length > 0) {
            name = data.name;
            address = data.address;
            birthdate = data.birthdate;
            handleFile = await AuthenticationController.moveFile(
              data.files,
              newUser.userId?.toString(),
              res
            );
            newUser.isOwner = true;
          }
          const token = helpers.generateAccesssToken(
            newUser.email ? newUser.email : ""
          );
          const newToken = new Token({
            userId: newUser.userId,
            token: token,
          });
          await newToken.save();
          await newUser.save();
          req.session.user = newUser;
          return res.status(200).send({
            msg: "Register successfully!",
            user: newUser,
            token: newToken,
          });
        } else {
          if (isVerified.msg === "OTP code is expired") {
          }
          return res.status(401).send({ msg: isVerified.msg });
        }
      } catch (error: any) {
        return res
          .status(500)
          .send({ msg: "OTP verification failed: " + error.message || error });
      }
    };

    this.validateLogin = async (
      req: Request,
      res: Response,
      next: NextFunction
    ) => {
      const { phonenumber, email, password, isOwner } = req.body;
      const conditions = [];
      if (email) {
        conditions.push({ email: email });
      }
      if (phonenumber) {
        conditions.push({ phonenumber: phonenumber });
      }

      try {
        const user = await User.findOne({
          $or: conditions,
        });
        if (user) {
          const failed = user.countFailed;
          if (isOwner) {
            if (user.status === "pending") {
              return res.status(429).send({
                msg: `Account is pending, Please login later`,
              });
            }
          }
          if (failed === 10) {
            return res
              .status(429)
              .send({
                msg: `Account is currently temporarily locked, please try again in 1 minute`,
              });
          }

          if (failed === 6) {
            return res
              .status(429)
              .send({
                msg: `Account has been permanently locked! You have entered the wrong password too many times! Contact admin to reopen account`,
              });
          }
          const isPasswordValid = await bcrypt.compare(password, user.password);
          if (isPasswordValid) {
            await User.updateOne(
              { userId: user.userId },
              { $set: { countFailed: 0 } }
            );
            return next();
          } else {
            if (failed === 2) {
              await User.updateOne(
                { userId: user.userId },
                { $set: { countFailed: 10 } }
              );
              setTimeout(async () => {
                await User.updateOne(
                  { userId: user.userId },
                  { $set: { countFailed: 3 } }
                );
                console.log(`Unlock account for ${user.name}`);
              }, 60000);
              return res.status(429).send({
                msg: "Account has been temporarily locked for 1 minute! If you continue to enter the wrong password 3 more times, it will be permanently locked!",
              });
            } else if (failed >= 5) {
              await User.updateOne(
                { userId: user.userId },
                { $set: { countFailed: 6, status: "block" } }
              );

              return res.status(429).send({
                msg: "Account has been permanently locked! You have entered the wrong password too many times! Contact admin to reopen account",
              });
            } else {
              await User.updateOne(
                { userId: user.userId },
                { $set: { countFailed: failed + 1 } }
              );

              return res.status(401).send({
                msg: `Incorrect password. You have ${failed + 1
                  } failed attempts.`,
              });
            }
          }
        } else {
          return res.status(404).send({ msg: "User not found" });
        }
      } catch (error: any) {
        return res.status(500).send({
          success: false,
          msg: error.message,
        });
      }
    };

    this.Login = async (req: Request, res: Response, next: NextFunction) => {
      const { phonenumber, email } = req.body;
      const conditions = [];
      if (email) {
        conditions.push({ email: email });
      }
      if (phonenumber) {
        conditions.push({ phonenumber: phonenumber });
      }
      try {
        const user = await User.findOne({
          $or: conditions,
        });

        if (user) {
          if (user.status === "block") {
            return res
              .status(403)
              .send(
                { msg: "This account has been disabled, please contact hotline 18001008" }
              );
          }
          let resToken = "";
          const existingToken = await Token.findOne({ userId: user.userId });

          if (existingToken) {
            existingToken.createdAt = new Date();
            await existingToken.save();
            resToken = existingToken.token;
          } else {
            const token = helpers.generateAccesssToken(
              user.email ? user.email : ""
            );
            const newToken = new Token({
              userId: user.userId,
              token: token,
              createdAt: new Date(), // Thêm thời gian tạo
            });
            resToken = token;
            await newToken.save();
          }
          req.session.user = user;
          return res.status(200).send({
            msg: "Login successfully!",
            token: resToken,
            user: user,
          });
        } else {
          return res.status(404).send({ msg: "User not found" });
        }
      } catch (error: any) {
        return res.status(500).send({ msg: error.message });
      }
    };

    this.LoginGoogle = async (
      req: Request,
      res: Response,
      next: NextFunction
    ) => {
      const { token, isOwner } = req.body;
      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
      try {
        const ticket = await client.verifyIdToken({
          idToken: token,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload: any = ticket.getPayload();
        const { email, name, picture } = payload;

        let user = await User.findOne({ email: email });
        if (!user) {
          if (!isOwner) {
            const password = uuidv4();
            user = new User({
              name,
              email,
              avatar: picture,
              password: password,
            });
            const newToken = new Token({
              userId: user.userId,
              token: token,
            });
            await newToken.save();
            await user.save();
            req.session.user = user;
            return res.status(200).send("Login sucessfully!");
          } else {
            return res.status(200).send({
              data: {
                email: email,
                name: name,
                picture: picture,
              },
              msg: "Login successfully, Please excute next step update profile!",
            });
          }
        } else {
          await Token.findOneAndUpdate(
            { userId: user.userId },
            { token: token, createdAt: new Date() },
            { upsert: true, new: true }
          );

          req.session.user = user;
          return res.status(200).send("Login successfully!");
        }
      } catch (error: any) {
        return res.status(500).send({ msg: error.message });
      }
    };

    this.verifyLoginGoogle = async (
      req: Request,
      res: Response,
      next: NextFunction
    ) => {
      const data = req.body;
      let userName = "";
      let birthdate = "";
      try {
        if (data) {
          const files = req.files as {
            [fieldname: string]: Express.Multer.File[];
          };
          if (!data.name || !data.address || !data.birthdate) {
            return res.status(400).send({ msg: "Missing information" });
          }
          if (helpers.calculateAge(new Date(data.birthdate)) < 18) {
            return res
              .status(400)
              .send({ msg: "You must be at least 18 years old to register" });
          }
          const password = uuidv4();
          const newUser = new User({
            name: userName,
            email: data.email,
            password: password,
            phonenumber: data.phonenumber,
            address: [data.address],
            birthdate: new Date(birthdate),
            countFailed: 0,
            avatar: data.avatar,
          });

          let handleFiles = await AuthenticationController.handleFile(
            files,
            res,
            newUser.userId?.toString()
          );
          if (handleFiles && Object.keys(handleFiles).length > 0) {
            newUser.name = data.name;
            newUser.address = data.address;
            newUser.birthdate = new Date(data.birthdate);
            newUser.frontLicense = handleFiles.frontLicense;
            newUser.backLicense = handleFiles.backLicense;
            newUser.frontLincenseCar = handleFiles.frontLincenseCar;
            newUser.backLincenseCar = handleFiles.backLincense;
            newUser.isOwner = true;
            const newToken = new Token({
              userId: newUser.userId,
              token: data.token,
            });
            await newToken.save();
            await newUser.save();
            req.session.user = newUser;
            return res.status(200).send("Login sucessfully!");
          }
          return res.status(500).send({ msg: "Login Failed!" });
        }
      } catch (err: any) {
        return res.status(500).send({ msg: err.message });
      }
    };

    this.LoginFacebook = async (
      req: Request,
      res: Response,
      next: NextFunction
    ) => {
      const { token, isOwner } = req.body;
      try {
        const url = `https://graph.facebook.com/me?access_token=${token}&fields=id,name,email,picture.type(large)`;
        const response = await fetch(url);
        const data = await response.json();

        const { email, name, picture } = data;

        let user = await User.findOne({ email: email });
        if (!user) {
          // user = new User({ name, email, avatar: picture.data.url });
          // const newToken = new Token({
          //   userId: user.userId,
          //   token: token,
          // });
          // await newToken.save();
          // await user.save();
          // req.session.user = user;
          // return res.status(200).send("Login sucessfully!");
          if (!isOwner) {
            user = new User({
              name,
              email,
              avatar: picture.data.url,
            });
            const newToken = new Token({
              userId: user.userId,
              token: token,
            });
            await newToken.save();
            await user.save();
            req.session.user = user;
            return res.status(200).send("Login sucessfully!");
          } else {
            return res.status(200).send({
              data: {
                email: email,
                name: name,
                picture: picture,
              },
              msg: "Login successfully, Please excute next step update profile!",
            });
          }
        } else {
          await Token.findOneAndUpdate(
            { userId: user.userId },
            { token: token, createdAt: new Date() },
            { upsert: true, new: true }
          );

          req.session.user = user;
          return res.status(200).send("Login successfully!");
        }
      } catch (error: any) {
        return res.status(500).send({ msg: error.message });
      }
    };

    this.verifyLoginFacebook = async (
      req: Request,
      res: Response,
      next: NextFunction
    ) => {
      const data = req.body;
      let address = "";
      let userName = "";
      let birthdate = "";
      try {
        if (data) {
          const files = req.files as {
            [fieldname: string]: Express.Multer.File[];
          };
          if (!data.name || !data.address || !data.birthdate) {
            return res.status(400).send({ msg: "Missing information" });
          }
          if (helpers.calculateAge(new Date(data.birthdate)) < 18) {
            return res
              .status(400)
              .send({ msg: "You must be at least 18 years old to register" });
          }

          const newUser = new User({
            name: userName,
            email: data.email,
            password: "",
            phonenumber: data.phonenumber,
            address: [data.address],
            birthdate: new Date(birthdate),
            countFailed: 0,
            avatar: data.avatar,
          });

          let handleFiles = await AuthenticationController.handleFile(
            files,
            res,
            newUser.userId?.toString()
          );
          if (handleFiles && Object.keys(handleFiles).length > 0) {
            newUser.name = data.name;
            newUser.address = data.address;
            newUser.birthdate = new Date(data.birthdate);
            newUser.frontLicense = handleFiles.frontLicense;
            newUser.backLicense = handleFiles.backLicense;
            newUser.frontLincenseCar = handleFiles.frontLincenseCar;
            newUser.backLincenseCar = handleFiles.backLincense;
            newUser.isOwner = true;
            const newToken = new Token({
              userId: newUser.userId,
              token: data.token,
            });
            await newToken.save();
            await newUser.save();
            req.session.user = newUser;
            return res.status(200).send("Login sucessfully!");
          }
          return res.status(500).send({ msg: "Login failed" });
        }
      } catch (err) {
        return res.status(500).send({ msg: err });
      }
    };

    this.Logout = async (req: Request, res: Response, next: NextFunction) => {
      try {
        await Token.deleteOne({ userId: req.session.user.userId });
        req.session.destroy((err) => {
          if (err) {
            return res.status(500).send({ msg: err.message });
          }
          return res.status(200).send("Logout successfully!");
        });
      } catch (error: any) {
        return res.status(500).send({ msg: error.message });
      }
    };

    this.forgotPassword = async (
      req: Request,
      res: Response,
      next: NextFunction
    ) => {
      const { phonenumber, email } = req.body;
      const conditions = [];
      if (email) {
        conditions.push({ email: email });
      }
      if (phonenumber) {
        conditions.push({ phonenumber: phonenumber });
      }
      try {
        const user = await User.findOne({
          $or: conditions,
        });

        if (user) {
          if (user.status === "block" || user.countFailed === 6) {
            return res
              .status(403)
              .send(
                { msg: "This account has been disabled, please contact hotline 18001008" }
              );
          }
          const otp = helpers.generateOTP();
          if (email) {
            const token = helpers.signTokenForgot(otp, email);
            const mailText = `Your OTP code is: ${otp}. This code is valid for 5 minutes.`;

            helpers.sendMail(email, "Your OTP Code", mailText).then(() => {
              return res.status(200).json({
                message: "OTP sent",
                token: token,
                email: email,
                otp: otp,
              });
            });
          } else {
            const token = helpers.signTokenForgot(otp, phonenumber);
            helpers.sendOtp(phonenumber, otp).then(() => {
              return res.status(200).json({
                message: "OTP sent",
                token: token,
                phonenumber: phonenumber,
                otp: otp,
              });
            });
          }
        } else {
          return res.status(404).send({ msg: "User not found" });
        }
      } catch (error: any) {
        return res.status(500).send({ msg: error.message });
      }
    };

    this.verifyOTPForgot = async (
      req: Request,
      res: Response,
      next: NextFunction
    ) => {
      const { input, otp, token } = req.body;
      try {
        const isVerified = helpers.verifyOTP(input, otp, token, "FORGOT");
        if (isVerified.status) {
          return res.status(200).send(isVerified.msg);
        } else {
          return res.status(401).send({
            msg: isVerified.msg,
            err: isVerified.err,
          });
        }
      } catch (error: any) {
        return res
          .status(500)
          .send({ msg: "OTP verification failed: " + error.message || error });
      }
    };

    this.confirmPassword = async (
      req: Request,
      res: Response,
      next: NextFunction
    ) => {
      const { newPassword, confirmPassword, input } = req.body;
      try {
        const user = await User.findOne({
          $or: [{ email: input }, { phonenumber: input }],
        });
        if (newPassword !== confirmPassword) {
          return res
            .status(400)
            .send({ msg: "Password and confirm password do not match" });
        }
        const hash = await bcrypt.hash(newPassword, this.saltRounds);
        if (!hash) {
          return res.status(500).send({ msg: "Password encryption failed" });
        }
        if (user) {
          await User.updateOne(
            { $or: [{ email: input }, { phonenumber: input }] },
            { $set: { password: hash } }
          );
          return res.status(200).send("Password updated successfully");
        }
      } catch (error: any) {
        return res.status(500).send({ msg: error.message });
      }
    };
    // #endregion
  }

  static async handleFile(
    files: { [fieldname: string]: Express.Multer.File[] },
    res: Response,
    userId: string = ""
  ) {
    try {
      let uploadedFiles: { [fieldname: string]: string } = {};
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

  static async moveFile(
    uploadedFiles: { [fieldname: string]: string },
    userId: string = "",
    res: Response
  ) {
    try {
      let movedFiles: { [fieldname: string]: string } = {};
      for (const fieldname in uploadedFiles) {
        const tempFileUrl = uploadedFiles[fieldname];
        const decodedUrl = decodeURIComponent(tempFileUrl.split("?")[0]);
        const tempFilePath = decodedUrl.split("/o/")[1];
        const tempFileRef = ref(storage, tempFilePath);

        const newFilePath = `${userId}/${tempFilePath.split("/").pop()}`;
        const newFileRef = ref(storage, newFilePath);

        // Fetch the file buffer from the temporary URL
        const response = await fetch(tempFileUrl);
        const fileBuffer = await response.arrayBuffer();

        const contentType =
          response.headers.get("content-type") || "application/octet-stream";
        const newFileBuffer = new Uint8Array(fileBuffer);

        // Upload the file to the new location with the correct metadata
        await uploadBytes(newFileRef, newFileBuffer, {
          contentType: contentType,
          contentDisposition: "inline",
        });

        // Get the new file URL
        const newFileUrl = await getDownloadURL(newFileRef);
        movedFiles[fieldname] = newFileUrl;

        // Delete the temporary file
        await deleteObject(tempFileRef);
      }
      return movedFiles;
    } catch (error) {
      res.status(500).json({ msg: "Error moving files", error });
    }
  }
}

export default new AuthenticationController();
