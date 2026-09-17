import { Body, Button, Container, Head, Heading, Html, Preview, Text } from "@react-email/components";

type ResetPasswordEmailProps = {
	resetUrl: string;
};

export function ResetPasswordEmail({ resetUrl }: ResetPasswordEmailProps) {
	return (
		<Html>
			<Head />
			<Preview>Redefinir sua senha</Preview>
			<Body style={{ backgroundColor: "#0a0a0a", fontFamily: "sans-serif", padding: "32px 0" }}>
				<Container
					style={{
						backgroundColor: "#171717",
						borderRadius: "12px",
						padding: "32px",
						maxWidth: "480px",
						border: "1px solid #f97316",
					}}
				>
					<Heading style={{ color: "#f97316", fontSize: "20px" }}>Redefinir senha</Heading>
					<Text style={{ color: "#e5e5e5", fontSize: "14px", lineHeight: "22px" }}>
						Recebemos um pedido para redefinir sua senha. Clique no botão abaixo para escolher uma nova
						senha. Este link expira em breve.
					</Text>
					<Button
						href={resetUrl}
						style={{
							backgroundColor: "#f97316",
							color: "#0a0a0a",
							padding: "12px 24px",
							borderRadius: "8px",
							fontWeight: "bold",
							fontSize: "14px",
						}}
					>
						Redefinir senha
					</Button>
					<Text style={{ color: "#a3a3a3", fontSize: "12px", marginTop: "24px" }}>
						Se você não pediu essa alteração, ignore este e-mail — sua senha continua a mesma.
					</Text>
				</Container>
			</Body>
		</Html>
	);
}

export default ResetPasswordEmail;
