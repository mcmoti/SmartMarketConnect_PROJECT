import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserCircle, Camera, Check, Pencil, ShieldCheck, MapPin, Phone, User as UserIcon, X, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { djangoAPI } from "@/integrations/django/client";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

const UserProfileDialog = () => {
  const { user, refreshUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  
  const [name, setName] = useState(user?.full_name || user?.username || "");
  const [phone, setPhone] = useState(user?.phone_number || "");
  const [location, setLocation] = useState(user?.location || "");
  const [bio, setBio] = useState(user?.bio || "");

  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== newPasswordConfirm) {
      toast.error("New passwords do not match");
      return;
    }
    if (!oldPassword || !newPassword) {
      toast.error("Please fill in current and new password");
      return;
    }

    try {
      setLoading(true);
      await djangoAPI.changePassword(oldPassword, newPassword);
      toast.success("Password updated successfully");
      setOldPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
    } catch (err: any) {
      toast.error(err.response?.data?.old_password?.[0] || "Failed to change password. Please check your old password.");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast.loading("Uploading photo...", { id: "photo-upload" });
      try {
        const formData = new FormData();
        formData.append('profile_image', file);
        
        await djangoAPI.patch('/users/me/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        await refreshUser();
        toast.success("Profile photo updated!", { id: "photo-upload" });
      } catch (err) {
        toast.error("Failed to upload profile photo.", { id: "photo-upload" });
      }
    }
  };

  const handlePhotoRemove = async () => {
    toast.loading("Removing photo...", { id: "photo-remove" });
    try {
      await djangoAPI.patch('/users/me/', { profile_image: null });
      await refreshUser();
      toast.success("Profile photo removed!", { id: "photo-remove" });
      setViewerOpen(false);
    } catch (err) {
      toast.error("Failed to remove photo.", { id: "photo-remove" });
    }
  };

  const saveField = async (field: string) => {
    try {
      const payload: Record<string, string> = {};
      if (field === "Name") {
        const parts = name.trim().split(" ");
        payload.first_name = parts[0] || "";
        payload.last_name = parts.slice(1).join(" ") || "";
      }
      if (field === "Phone") payload.phone_number = phone;
      if (field === "Location") payload.location = location;
      if (field === "Bio") payload.bio = bio;

      await djangoAPI.patch("/users/me/", payload);
      toast.success(`${field} updated!`);
      
      if (field === "Name") setIsEditingName(false);
      if (field === "Phone") setIsEditingPhone(false);
      if (field === "Location") setIsEditingLocation(false);
      if (field === "Bio") setIsEditingBio(false);
      
      await djangoAPI.getCurrentUser();
    } catch (err) {
      toast.error(`Failed to update ${field}.`);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="h-10 w-10 flex-shrink-0 rounded-full bg-slate-200 border border-slate-300 overflow-hidden flex flex-col items-center justify-center text-slate-500 hover:opacity-80 transition-opacity">
           <UserIcon className="h-6 w-6 mt-1" />
        </button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden bg-slate-50 gap-0 border-0 outline-none">
        
        {/* Header - fixed */}
        <div className="bg-[#205E41] text-white px-5 py-4 flex items-center justify-between">
          <h2 className="font-bold text-lg tracking-tight">Profile Settings</h2>
        </div>

        <ScrollArea className="max-h-[80vh] overflow-y-auto">
          <div className="p-6 space-y-8">
            
            {/* Avatar Section */}
            <div className="flex flex-col items-center">
              <div className="relative group cursor-pointer" onClick={() => setViewerOpen(true)}>
                <div className="h-32 w-32 rounded-full bg-slate-200 border-4 border-white shadow-md flex items-center justify-center overflow-hidden">
                  {user?.profile_image ? (
                    <img src={user.profile_image} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <UserCircle className="h-20 w-20 text-slate-400" />
                  )}
                </div>
                {/* Camera Badge Overly */}
                <div className="absolute bottom-1 right-1 h-10 w-10 bg-[#205E41] rounded-full flex items-center justify-center ring-4 ring-slate-50 shadow-lg text-white group-hover:scale-105 transition-transform">
                  <Camera className="h-5 w-5" />
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
              </div>
            </div>

            {/* Editable Info List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              
              {/* Name Field */}
              <div className="p-4 border-b border-slate-50 flex items-start gap-4">
                 <UserIcon className="h-5 w-5 text-slate-400 mt-1" />
                 <div className="flex-1">
                   <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Name</p>
                   {isEditingName ? (
                     <div className="flex items-center gap-2">
                       <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-sm" autoFocus />
                       <Button size="icon" variant="ghost" className="h-8 w-8 text-[#205E41]" onClick={() => saveField("Name")}><Check className="h-4 w-4" /></Button>
                     </div>
                   ) : (
                     <div className="flex items-center justify-between group">
                       <p className="font-medium text-foreground">{name}</p>
                       <button onClick={() => setIsEditingName(true)} className="text-slate-300 group-hover:text-[#205E41] transition-colors"><Pencil className="h-4 w-4" /></button>
                     </div>
                   )}
                   <p className="text-xs text-slate-400 mt-1">This is not your username or pin. This name will be visible to your Smart Market Connect contacts.</p>
                 </div>
              </div>

              {/* Phone Field */}
              <div className="p-4 border-b border-slate-50 flex items-start gap-4">
                 <Phone className="h-5 w-5 text-slate-400 mt-1" />
                 <div className="flex-1">
                   <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Phone</p>
                   {isEditingPhone ? (
                     <div className="flex items-center gap-2">
                       <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-8 text-sm" autoFocus />
                       <Button size="icon" variant="ghost" className="h-8 w-8 text-[#205E41]" onClick={() => saveField("Phone")}><Check className="h-4 w-4" /></Button>
                     </div>
                   ) : (
                     <div className="flex items-center justify-between group">
                       <p className="font-medium text-foreground">{phone || "Not provided"}</p>
                       <button onClick={() => setIsEditingPhone(true)} className="text-slate-300 group-hover:text-[#205E41] transition-colors"><Pencil className="h-4 w-4" /></button>
                     </div>
                   )}
                 </div>
              </div>

               {/* Location Field */}
               <div className="p-4 border-b border-slate-50 flex items-start gap-4">
                 <MapPin className="h-5 w-5 text-slate-400 mt-1" />
                 <div className="flex-1">
                   <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Location</p>
                   {isEditingLocation ? (
                     <div className="flex items-center gap-2">
                       <Input value={location} onChange={(e) => setLocation(e.target.value)} className="h-8 text-sm" autoFocus />
                       <Button size="icon" variant="ghost" className="h-8 w-8 text-[#205E41]" onClick={() => saveField("Location")}><Check className="h-4 w-4" /></Button>
                     </div>
                   ) : (
                     <div className="flex items-center justify-between group">
                       <p className="font-medium text-foreground">{location || "Not provided"}</p>
                       <button onClick={() => setIsEditingLocation(true)} className="text-slate-300 group-hover:text-[#205E41] transition-colors"><Pencil className="h-4 w-4" /></button>
                     </div>
                   )}
                 </div>
              </div>

               {/* Bio Field */}
               <div className="p-4 flex items-start gap-4">
                 <UserCircle className="h-5 w-5 text-slate-400 mt-1" />
                 <div className="flex-1">
                   <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Bio</p>
                   {isEditingBio ? (
                     <div className="flex flex-col gap-2">
                       <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="w-full text-sm border rounded-md p-2 bg-slate-50/50 resize-y focus:outline-none focus:ring-1 focus:ring-primary/40" autoFocus rows={3}></textarea>
                       <Button size="sm" variant="outline" className="text-[#205E41] self-end h-8" onClick={() => saveField("Bio")}>Save Bio</Button>
                     </div>
                   ) : (
                     <div className="flex items-start justify-between group">
                       <p className="font-medium text-foreground text-sm whitespace-pre-wrap">{bio || "Add a bio to let others know more about you."}</p>
                       <button onClick={() => setIsEditingBio(true)} className="text-slate-300 group-hover:text-[#205E41] transition-colors shrink-0 ml-2"><Pencil className="h-4 w-4" /></button>
                     </div>
                   )}
                 </div>
              </div>

            </div>

            {/* Change Password Block inline */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
               <div className="flex items-center gap-2 mb-4 text-[#205E41]">
                  <ShieldCheck className="h-5 w-5" />
                  <h3 className="font-bold text-sm tracking-tight text-foreground">Security & Password</h3>
               </div>
               
               <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="old" className="text-xs text-muted-foreground ml-1">Current Password</Label>
                  <Input id="old" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="Enter current password" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new" className="text-xs text-muted-foreground ml-1">New Password</Label>
                  <Input id="new" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm" className="text-xs text-muted-foreground ml-1">Confirm New Password</Label>
                  <Input id="confirm" type="password" value={newPasswordConfirm} onChange={(e) => setNewPasswordConfirm(e.target.value)} placeholder="Confirm new password" />
                </div>
                
                <Button type="submit" className="w-full mt-2 font-bold bg-[#A9DFC4] text-[#1a4a33] hover:bg-[#8eceab]" disabled={loading}>
                  {loading ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </div>
            
          </div>
        </ScrollArea>

        {/* WhatsApp-like Photo Viewer Overlay */}
        {viewerOpen && (
          <div className="absolute inset-0 z-50 bg-black/95 flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 text-white">
              <button onClick={() => setViewerOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="h-6 w-6" />
              </button>
              <h3 className="font-medium text-sm tracking-wide">Profile Photo</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-white/10 rounded-full transition-colors" title="Change Photo">
                  <Pencil className="h-5 w-5" />
                </button>
                {user?.profile_image && (
                  <button onClick={handlePhotoRemove} className="p-2 hover:bg-white/10 rounded-full transition-colors text-red-400" title="Remove Photo">
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
            
            {/* Main Image */}
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="w-full max-w-sm aspect-square bg-slate-800 rounded-full overflow-hidden flex items-center justify-center relative shadow-2xl">
                {user?.profile_image ? (
                  <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <UserCircle className="h-48 w-48 text-slate-600" />
                )}
              </div>
            </div>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
};

export default UserProfileDialog;
